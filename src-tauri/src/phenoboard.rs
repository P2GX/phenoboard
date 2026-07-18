//! This module creates a singleton object that we use to coordinate analysis across the application
//!


use crate::{directory_manager::DirectoryManager, dto::{pmid_dto::PmidDto}, hpo::MiningConcept, settings::HpoCuratorSettings, util::{pubmed_retrieval::PubmedRetriever}};
use std::{collections::HashSet, env, fs::File, io::Write, path::{Path, PathBuf},  sync::Arc};


use ontolius::{io::OntologyLoaderBuilder, ontology::{MetadataAware, OntologyTerms, csr::FullCsrOntology}};
use fenominal::{AutoCompleter, Fenominal, FenominalHit, FenominalSentence, OntologyMatch};
use ga4ghphetools::{dto::{cohort_dto::{CohortData, CohortType, DiseaseData}, etl_dto::EtlDto, hpo_term_dto::{ CellValueInner, HpoTermDuplet}, variant_dto::VariantDto}, hpoa, repo::repo_qc::RepoQc, tauri::models::HierarchyMapItem};
use ga4ghphetools;
use rfd::FileDialog;
use crate::dto::status_dto::StatusDto;



/// A singleton that coordinates all interactions with the backend (including GA4GH Phenoboard)
pub struct PhenoboardSingleton {
    settings: HpoCuratorSettings,
    /// Human Phenotype Ontology
    ontology: Option<Arc<FullCsrOntology>>,
    /// Path to save the phetools template
    pt_template_path: Option<String>,
    /// Path to the directory where we store the template and the phenopackets
    pt_template_dir_path: Option<PathBuf>,
    ///  Autocompletion from fenominal library
    autocompleter: Option<AutoCompleter>,
}

impl PhenoboardSingleton {
    /// Create a new instance of PhenoboardSingleton
    /// 
    /// The constructor will try to load the HPO from the settings file if available;
    /// if something does not work, it will leave the ontology field as None
    pub fn new() -> Self {
        let mut singleton = PhenoboardSingleton::default();
        let hpo_json_result= singleton.settings.get_hp_json_path();
        if hpo_json_result.is_err() {
            return singleton;
        }
        let hpo_json = hpo_json_result.unwrap();
        let loader = OntologyLoaderBuilder::new().obographs_parser().build();
        let ontology_opt: Option<FullCsrOntology> = loader.load_from_path(hpo_json.clone()).ok();
        if let Some(hpo) = ontology_opt {
            let hpo_arc = Arc::new(hpo);
            singleton.ontology = Some(hpo_arc.clone());
            singleton.autocompleter = Some(AutoCompleter::new(hpo_arc.clone()));
            singleton.set_hpo(hpo_arc.clone(), &hpo_json);
        }           
        return singleton;
    }



    pub fn set_hpo(&mut self, ontology: Arc<FullCsrOntology>, hpo_json_path: &str) {
        self.ontology = Some(ontology.clone());
        self.autocompleter = Some(AutoCompleter::new(ontology.clone()));
        let _ = self.settings.set_hp_json_path(hpo_json_path);
    }

    pub fn get_hpo(&self) -> Option<Arc<FullCsrOntology>> {
        match &self.ontology {
            Some(hpo) => Some(hpo.clone()),
            None => None,
        }
    }


    pub fn get_mining_concepts(&self, idx: usize, text: &str) -> Vec<MiningConcept> {
        let parts: Vec<&str> = text.split(&[';', '\n'][..])
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .collect();
        let mut concepts = Vec::new();
        for part in parts {
            // Try to get a fuzzy match for this specific snippet
            let matches = self.search_hpo(part, 1);
            let suggested = match matches.first().cloned() {
                Some(m) => {
                    let input_len = part.len();
                    let label_len = m.label.len();

                    // HEURISTIC: Prevent noise like "Y" matching "Yawning"
                    // 1. If input is < 3 chars, it MUST be an exact case-insensitive match
                    // 2. Or, if the match is too "far" (label is 4x longer than input), ignore it
                    if input_len < 3 && part.to_lowercase() != m.label.to_lowercase() {
                        vec![]
                    } else if label_len > (input_len * 2) {
                        vec![] // Filter out long labels for short inputs
                    } else {
                        vec![m]
                    }
                },
                None => vec![]
            };
            concepts.push(MiningConcept {
                original_text: part.to_string(),
                row_index_list: vec![idx],
                suggested_terms: suggested,
                mining_status: crate::hpo::MiningStatus::Pending,
            });
        }
        concepts
    }


    /// Provide Strings with TermId - Label that will be used for autocompletion
    /// fenominal functionality
    pub fn search_hpo(&self, query: &str, limit: usize) -> Vec<OntologyMatch> {
        self.autocompleter
            .as_ref()
            .map(|ac| ac.search_hpo(query, limit))
            .unwrap_or_default()
    }

    pub fn get_modifiers(&self) -> Result<Vec<HpoTermDuplet>, String> {
        let hpo = self.ontology.as_ref().ok_or_else(|| "HPO not initialized".to_string())?;
        ga4ghphetools::hpo::get_modifiers(hpo.clone())
    }


    /// We want to get the single best match of any HPO term label to the query string
    /// using the fenominal autocompletion functionality
    pub fn get_best_hpo_match(&self, query: String) -> Option<OntologyMatch> {
        self.autocompleter
            .as_ref()
            .map(|ac| ac.get_best_hpo_match(query))
            .unwrap_or_default()
    }


    pub fn hp_json_path(&self) -> Result<String, String> {
        match &self.settings.get_hp_json_path() {
            Ok(hp_json) =>  Ok(hp_json.clone()),
            Err(e) => Err(e.clone()),
        }
    }

    pub fn pt_template_path(&self) -> Result<String, String> {
        match &self.pt_template_path {
            Some(pt_template) => Ok(pt_template.to_string()),
            None => Err("phenotype template path not initialized".to_string()),
        }
    }

    pub fn reset_pt_template_path(&mut self) {
        self.pt_template_path = None;
    }


    /// The template files are located in a subsub directory of the project directory.
    /// This function retrieves a PathBuf that points to the project directory.
    fn get_grandparent_dir(file_path: &str) -> Option<PathBuf> {
        let path = Path::new(file_path);
        path.parent()?.parent().map(|p| p.to_path_buf())
    }

     /// The JSON files are located in a sub directory of the project directory.
    /// This function retrieves a PathBuf that points to the project directory.
    fn get_parent_dir(file_path: &str) -> Option<PathBuf> {
        let path = Path::new(file_path);
        path.parent().map(|p| p.to_path_buf())
    }


    /// Load an excel file containing a phetools template (version 1). Use this to initialize the Phetools backend
    /// * Arguments
    /// 
    /// - `excel_file` - the template file
    /// - `update_labels` - attempt to fix errors including outdated HPO ids or labels and stray-whitespace errors
    /// 
    /// * Returns
    /// - Ok(()) if successful, list of errors (strings) otherwise
    pub fn load_excel_template<F>(
        &mut self, 
        excel_file: &str,
        update_labels: bool,
         progress_cb: F) 
    -> Result<CohortData, String> 
    where F: FnMut(u32, u32) {
        let hpo = match &self.ontology {
            Some(onto) => onto.clone(),
            None => { return Err("Could not load Excel because HPO was not initialized".to_string());}
        };
        let result =  ga4ghphetools::factory::load_pyphetools_excel_template(
            excel_file, 
                update_labels, 
                hpo, 
                progress_cb);
        match result {
            Ok(dto) => {
                self.pt_template_path = Some(excel_file.to_string());
                let project_dir = Self::get_grandparent_dir(excel_file);
                if project_dir.is_none() {
                    return Err(format!("Could not load project directory for {excel_file}"));
                }
                let project_dir = project_dir.unwrap();
                let _ = Self::get_or_create_dir(project_dir)
                    .map_err(|e| e.to_string())?; // creates the directory if needed, but
                    // for import of existing projects there will also be a directory there, so this
                    // is a sanity check
                Ok(dto)
            }
            Err(msg) => {
                return Err(msg);
            }
        }
    }

    pub fn load_ptools_json(
        &mut self,
        json_file: &str,
    ) -> Result<CohortData, String> {
        match Self::get_parent_dir(json_file) {
            Some(project_dir) => {
                ga4ghphetools::persistence::initialize_project_dir(project_dir)?;
                ga4ghphetools::factory::load_json_cohort(json_file)
            },
            None => Err("Could not load JSON template because we could not initialize the parent directory".to_string()),
        }
    }
 
    /// Get a DTO that summarizes the status of the data in the backend
    pub fn get_status(&self) -> StatusDto {
        let mut status = StatusDto::default(); 
        match &self.ontology {
            Some(hpo) => {
                status.hpo_loaded = true;
                status.hpo_version = hpo.version().to_string();
                status.n_hpo_terms = hpo.len();
            },
            None => {
                status.hpo_loaded = false;
                status.hpo_version = String::default();
                status.n_hpo_terms = 0 as usize;
            },
        }
        match &self.pt_template_path {
            Some(path) => {
                status.pt_template_path = path.to_string();
                status.pt_template_loaded = true;
            },
            None => {
                status.pt_template_path = String::default();
            },
        }
        status.hpo_json_path = self.settings.get_hp_json_path().clone()
            .unwrap_or_else(|_| "Not Initialized".to_string()); 
        status.biocurator_orcid =self.settings.get_biocurator_orcid().clone()
            .unwrap_or_else(|_| "Not Set".to_string());
        return status;
    }


    pub fn get_ppkt_store_json(&self) ->  Result<serde_json::Value, String> {
        let file_path = match &self.pt_template_path {
            Some(path) => path,
            None => {return Err(format!("Template path not initialized"));},
        };
        let path = Path::new(&file_path);
        let parent = match path.parent() {
            Some(parent_path) => parent_path,
            None => {return Err(format!("Template parent path not initialized"));},
        };
        let dirman = DirectoryManager::new(parent.to_string_lossy())?;
        return dirman.get_json();
    }

    pub fn mine_clinical_text(
        &self,
        text: &str
     ) -> Result<Vec<FenominalSentence>, String> {
        let hpo = self.ontology.as_ref().ok_or_else(|| "HPO not initialized".to_string())?;
        let fenominal = Fenominal::new(hpo.clone());
        fenominal.mine_sentences(text).map_err(|e|e.to_string())
    }

    pub fn perform_hpo_autocomplete(&self, query: String) -> Result<Vec<OntologyMatch>, String> {
        let autocompleter = self.autocompleter.as_ref().ok_or_else(|| "Autocomplete not initialized".to_string())?;
        let n_term_limit = 20;
        Ok(autocompleter.search_hpo(&query, n_term_limit))
    }

        pub fn get_hpo_parent_and_children_terms(&self, term_id: &str) -> Result<HierarchyMapItem, String> {
            match &self.ontology {
                Some(hpo) => {
                    let hm = ga4ghphetools::tauri::parent_child::get_hpo_parent_and_children_terms(term_id, hpo.clone());
                    Ok(hm)
                },
                None => Err("Could not retrieve parent/child hierarchy".to_string())
            }
        }

    /// create name of JSON cohort template file, {gene}_{disease}_individuals.json
    fn extract_template_name(&self, cohort_dto: &CohortData) -> Result<String, String> {
        ga4ghphetools::factory::extract_template_name(cohort_dto)
    }

    pub fn save_template_json(&self, cohort_dto: CohortData) -> Result<(), String> {
        let save_dir = match &self.pt_template_dir_path {
            Some(dir) => dir.clone(),
            None => {
                // Use home directory as fallback
                dirs::home_dir().ok_or("Could not get home directory")?
            }
        };
        let template_name = self.extract_template_name(&cohort_dto)?;
        let save_path: Option<PathBuf> = FileDialog::new()
            .set_directory(save_dir)
            .set_title("Save PheTools JSON template")
            .set_file_name(template_name)
            .save_file();

        if let Some(path) = save_path {
            // Serialize DTO to JSON string
            let json = serde_json::to_string_pretty(&cohort_dto).map_err(|_|"Could not serialize to JSON".to_string())?;
            let mut file = File::create(&path).map_err(|_|"Could not create file".to_string())?;
            file.write_all(json.as_bytes()).map_err(|_|"Could not write file".to_string())?;

            println!("Saved JSON to {:?}", path);
        } else {
            return Err("Save cancelled by user".to_string());
        };
        Ok(())
    }


    /// Get the default directory for the current cohort. Used to figure out where to save files.
    fn get_default_dir(&self) -> Result<PathBuf, String> {
        if let Some(cohort_dir) = &self.pt_template_dir_path {
            return Ok(cohort_dir.clone());
        }
        let home_dir = env::var("HOME")
            .or_else(|_| env::var("USERPROFILE")) // Windows fallback
            .map_err(|_| "Failed to get home directory".to_string())?;
        Ok(PathBuf::from(home_dir))
    }

    pub fn get_phenopackets_output_dir(&self) -> Result<PathBuf, String> {
        let default_dir = self.get_default_dir()?;
        FileDialog::new()
            .set_directory(default_dir)
            .set_title("Select Output Directory")
            .pick_folder()
            .ok_or_else(|| "User canceled or dialog failed".to_string())
    }

    /// Export a list of phenopackets derived from the cohort.
    pub fn export_ppkt(
        &mut self,
        directory: String, 
        cohort: CohortData, 
        overwrite: bool) 
        -> Result<usize, String> 
    {
        let path = PathBuf::from(&directory);
        let orcid = match self.settings.get_biocurator_orcid() {
            Ok(orcid_id) => orcid_id,
            Err(e) => { return Err(format!("Cannot save phenopackets without ORCID id: {}", e)); }
        };
        match &self.ontology {
            Some(hpo) =>  ga4ghphetools::ppkt::write_phenopackets(cohort, path, orcid, hpo.clone(), overwrite),
            None => Err("Cannot export phenopackets because HPO not initialized".to_string()),
        }
    }


    pub fn get_repo_qc(&self) -> Result<RepoQc, String> {
        let out_dir = match self.get_phenopackets_output_dir() {
            Ok(dir) => dir,
            Err(e) =>  { return Err(e);},
        };
        ga4ghphetools::repo::get_repo_qc(&out_dir)
    }

    /// Exports the HPOA (Human Phenotype Ontology Annotations) for a given cohort.
    ///
    /// # Arguments
    ///
    /// * `cohort_dto` - A `CohortDto` struct containing information about the cohort,
    ///   including individuals, diseases, genes, and phenotypes.
    ///
    /// # Returns
    ///
    /// * `Ok(String)` - A string to summarize the successful result.
    /// * `Err(String)` - An error message if the export fails.
    ///
    /// # Notes
    ///
    /// - The output format follows the HPO project guidelines for phenotype annotations.
    /// - Each individual in the cohort is converted to one or more HPOA rows.
    /// - This function may fail if required fields in `CohortDto` are missing or invalid.
    pub fn export_hpoa(
        &mut self,
        cohort_dto: CohortData)
    -> Result<String, String> {
        let out_dir = self.get_phenopackets_output_dir()?;
        let orcid = match self.settings.get_biocurator_orcid() {
            Ok(orcid_id) => orcid_id.to_string(),
            Err(e) => { return Err(format!("Cannot save HPOA without ORCID id: {}", e)); }
        };
        match &self.ontology {
            Some(hpo) => {
                hpoa::write_hpoa_tsv(cohort_dto, hpo.clone(), &orcid, &out_dir)?;
                Ok(format!("Wrote HPOA file to {}", out_dir.to_string_lossy()))
            },
            None => {
                Err("Phetools template not initialized".to_string())
            },
        }
    }


    pub fn add_hpo_term_to_cohort(
        &mut self,
        hpo_id: &str,
        hpo_label: &str,
        cohort_dto: CohortData) 
    -> std::result::Result<CohortData, String> {
        let hpo = match &self.ontology {
            Some(onto) => onto.clone(),
            None => {return Err("HPO ontology object not initialized".to_string()); }
        };
        ga4ghphetools::factory::add_hpo_term_to_cohort(hpo_id, hpo_label, hpo, cohort_dto)
    }

    /// Generate a CohortType from seed HPO terms and some information about the disease & gene
    /// Mendelian only
    pub fn create_new_cohort_data(
        &mut self,
        dto: DiseaseData,
        cohort_type: CohortType,
        acronym: String
    ) -> Result<CohortData, String> {
        let hpo = match &self.ontology {
            Some(onto) => onto.clone(),
            None => { return Err("HPO object not initialized".to_string()); }
        };
        ga4ghphetools::factory::create_new_cohort_data(cohort_type, dto, acronym, hpo)     
    }


    pub async fn get_pmid_dto(input: &str) -> Result<PmidDto, String> {
        let retriever = PubmedRetriever::new(input)?;
        retriever.get().await
    }
    

   

    pub fn get_biocurator_orcid(&self) -> Result<String, String> {
       self.settings.get_biocurator_orcid()
    }

    pub fn save_biocurator_orcid(&mut self, orcid: String) -> Result<StatusDto, String> {
        self.settings.save_biocurator_orcid(orcid)?;
        Ok(self.get_status())
    }

    pub fn get_variant_analysis(
        &self,
        cohort_dto: CohortData
    ) -> Result<Vec<VariantDto>, String> {
        ga4ghphetools::variant::analyze_variants(cohort_dto)
    }

    pub fn process_allele_column<F>(
        &self,
        etl: EtlDto,
        col: usize,
        progress_cb: F
    ) -> Result<EtlDto, String> where F: FnMut(u32, u32) {
   
        match &self.ontology {
            Some(hpo) =>  ga4ghphetools::etl::process_allele_column(hpo.clone(),etl, col, progress_cb),
            None => Err("HPO not initialized".to_string()),
        }
       
    }


    /// Ensure the directory at `dir_path` exists, creating it if necessary, 
    /// and return its canonical (absolute) path.
    ///
    /// # Arguments
    ///
    /// * `dir_path` - Path to the directory to get or create.
    ///
    /// # Errors
    ///
    /// Returns an `io::Error` if the directory cannot be created or canonicalized.
    pub fn get_or_create_dir<P: AsRef<Path>>(dir_path: P) -> std::io::Result<PathBuf> {
        let path = dir_path.as_ref();

        if !path.exists() {
            std::fs::create_dir_all(path)?;
        }

        if !path.is_dir() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Path exists but is not a directory: {:?}", path),
            ));
        }

        path.canonicalize()
    }
///
/// This method traverses the `hpo_data` of every row in the [`CohortData`] 
/// to find `OnsetAge` variants. It returns a deduplicated list of strings.
///
/// # Arguments
/// * `dto` - The [`CohortData`] containing phenotype and age information.
///
/// # Returns
/// * `Ok(Vec<String>)` - A unique list of age strings found in the data.
/// * `Err(String)` - An error message if processing fails.
pub fn get_all_cohort_age_strings(
    &self,
    dto: CohortData
) -> Result<Vec<String>, String> {
    let age_strings: HashSet<String> = dto
        .rows
        .iter()
        .flat_map(|row| &row.hpo_data)
        .filter_map(|entry| match &entry.entry {
            CellValueInner::OnsetAge(onset) => Some(onset.to_string()),
            _ => None,
        })
        .collect();
    Ok(age_strings.into_iter().collect())
}


}


impl Default for PhenoboardSingleton {
    fn default() -> Self {
        Self { 
            settings: HpoCuratorSettings::load_settings(), 
            ontology: None, 
            pt_template_path: None, 
            pt_template_dir_path: None,
            autocompleter: None,
        }
    }
}


#[cfg(test)]
mod tests {
    

    use std::io::BufReader;

    use super::*;
    pub fn hpo() -> Arc<FullCsrOntology> {
        let path = "/Users/robin/data/hpo/hp.json";
        let reader = BufReader::new(File::open(path).unwrap());
        let loader = OntologyLoaderBuilder::new().obographs_parser().build();
        let hpo = loader.load_from_read(reader).unwrap();
        Arc::new(hpo)
    }

   

}