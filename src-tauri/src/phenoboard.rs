//! This module creates a singleton object that we use to coordinate analysis across the application
//!


use crate::{directory_manager::DirectoryManager, dto::{pmid_dto::PmidDto, text_annotation_dto::{HpoAnnotationDto, ParentChildDto, TextAnnotationDto}}, hpo::hpo_version_checker::{HpoVersionChecker, OntoliusHpoVersionChecker}, settings::HpoCuratorSettings, util::{self, pubmed_retrieval::PubmedRetriever}};
use std::{env, fs::File, io::Write, path::{Path, PathBuf}, str::FromStr, sync::Arc};

use fuzzy_matcher::{skim::SkimMatcherV2, FuzzyMatcher};
use deunicode::deunicode;
use ontolius::{common::hpo::PHENOTYPIC_ABNORMALITY, io::OntologyLoaderBuilder, ontology::{csr::FullCsrOntology, HierarchyWalks, MetadataAware, OntologyTerms}, term::{MinimalTerm}, TermId};
use fenominal::{
    fenominal::{Fenominal, FenominalHit}
};
use ga4ghphetools::{dto::{cohort_dto::{CohortData, CohortType, DiseaseData}, variant_dto::VariantDto}, hpoa};
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
    /// Strings for autocompletion
    hpo_auto_complete: Vec<String>,
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
        let ontology_opt: Option<FullCsrOntology> = loader.load_from_path(hpo_json).ok();
        if let Some(hpo) = ontology_opt {
            let hpo_arc = Arc::new(hpo);
            singleton.ontology = Some(hpo_arc.clone());
            singleton.initialize_hpo_autocomplete();
            singleton.set_hpo(hpo_arc.clone());
        }           
        return singleton;
    }



    pub fn set_hpo(&mut self, ontology: Arc<FullCsrOntology>) {
        self.ontology = Some(ontology);
    }

    pub fn get_hpo(&self) -> Option<Arc<FullCsrOntology>> {
        match &self.ontology {
            Some(hpo) => Some(hpo.clone()),
            None => None,
        }
    }


    /// Provide Strings with TermId - Label that will be used for autocompletion
    pub fn get_hpo_autocomplete(&self) -> &Vec<String> {
        &self.hpo_auto_complete
    }

    /// We want to get the single best match of any HPO term label to the query string
    pub fn get_best_hpo_match(&self, query: String) -> String {
        let matcher = SkimMatcherV2::default();
        self.hpo_auto_complete.iter()
           .filter_map(|s| {
                let parts: Vec<&str> = s.splitn(2, " - ").collect();
                if parts.len() != 2 {
                    return None;
                }
                let label = parts[1];
                matcher.fuzzy_match(label, &query).map(|score| (s, score))
        })
        .max_by_key(|(_, score)| *score)
        .map(|(s, _)| s.clone())
        .unwrap_or_else(|| "n/a".to_string())
    }

    /// Set up autocomplete functionality that returns string with form HP:0000123 - Label
    fn initialize_hpo_autocomplete(&mut self) {
        // let phenotypic_abnormality: TermId = "HP:0000118".parse().unwrap();
        match &self.ontology {
            Some(hpo) => {
                self.hpo_auto_complete.clear();
                for tid in  hpo.iter_descendant_ids(&PHENOTYPIC_ABNORMALITY) {
                    match hpo.term_by_id(tid) {
                        Some(term) => {
                            let label = term.name();
                            let ac_string = format!("{tid} - {label}");
                            self.hpo_auto_complete.push(ac_string);
                            
                        },
                        None => { eprintln!("Could not retrieve term for {}", tid); }
                    }
                }
            },
            None => { eprintln!("Could not init HPO - should never happen")},
        }
        println!("initialize_hpo_autocomplete - got {} terms", self.hpo_auto_complete.len());
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
    /// The DTO is synchronized with the corresponding tscript in app/models
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
                let path2 = Path::new(&path);
                let cohort_name =  path2.file_stem()
                        .and_then(|stem| stem.to_str())
                        .map(|s| s.to_string());
                if cohort_name.is_some() {
                    status.cohort_name = cohort_name.unwrap();
                };
                status.pt_template_loaded = true;
            },
            None => {
                status.pt_template_path = String::default();
            },
        }
        status.new_cohort = false; // TODO
        status.unsaved_changes = false; // TODO
        return status;
    }

    pub fn hpo_can_be_updated(&self) -> Result<bool, String> {
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = hpo.clone();
                let hpo_update_checker = OntoliusHpoVersionChecker::new(&hpo_arc)?;
                let updatable = hpo_update_checker.hp_json_can_be_updated();
                return Ok(updatable);
            },
            None => Err(format!("Phetools template not initialized"))
        }
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


    /// Use our rust fenominal implementation to perform HPO text mining.
    /// 
    /// * Arguments
    /// `input_text` - Generally, a clinical text that contains HPO terms
    /// 
    /// * Returns: A list of  representing the fenominal hits.
    pub fn map_text_to_annotations(&self, input_text: &str) -> Result<Vec<TextAnnotationDto>, String> {
        println!("{}{}{}", file!(), line!(), input_text);
        match self.get_sorted_fenominal_hits(input_text) {
            Ok(fenominal_hits) => {
                println!("{:?}", fenominal_hits);
                return util::text_to_annotation::text_to_annotations(input_text, &fenominal_hits);
            },
            Err(e) => {return Err(e.to_string()); },
        }
    }

    /// Run fenominal and sort the results by span.
    /// We use deunicode to remove Unicode characters such as en-dash that are used in some input texts.
    /// en-dash is a 3-byte UTF-8 sequence (U+2013), and can cause UTF-8 character boundary issues with
    /// the text mining utilities in fenominal and phenoboard, and we do not need unicode characters for the downstream 
    /// processing
    fn get_sorted_fenominal_hits(&self, input_text: &str) 
        -> Result<Vec<FenominalHit>, String>
    {
        let deunicoded_text = deunicode(input_text);
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = Arc::clone(hpo);
                let fenominal = Fenominal::new(hpo_arc);
                let mut fenominal_hits: Vec<FenominalHit> = fenominal.process(&deunicoded_text);
                fenominal_hits.sort_by_key(|hit| hit.span.start);
                return Ok(fenominal_hits);
            }
            None => Err(format!("Could not initialize hpo")),
        }
    }

    /// Get an ordered list of HPO terms ids
    ///
    /// The intended use case is when we are initializing a new Pyphetools template and we
    /// want to prepopulate the template with HPO terms weare likely to curate.
    ///
    /// # Arguments
    ///
    /// * `input_text` - A string reference with clinical descriptions
    ///
    /// # Returns
    ///
    /// A vector of HPO TermIds (can be empty) that were mined from the text and arranged with DFS
    pub fn map_text_to_term_list(&mut self, input_text: &str) -> Vec<TermId> {
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = Arc::clone(hpo);
                let fenominal = Fenominal::new(hpo_arc);
                let fenom_hits: Vec<FenominalHit> = fenominal.process(input_text);
                let mut tid_list: Vec<TermId> = Vec::new();
                for hit in fenom_hits {
                    // Fenominal hit.term_id can be unwrapped
                    let tid = TermId::from_str(&hit.term_id).unwrap();
                    tid_list.push(tid);
                }
                let ordered_hpo_ids = ga4ghphetools::hpo::hpo_terms_to_dfs_order(hpo.clone(), &tid_list);
                return ordered_hpo_ids;
            }
            None => {
                return vec![];
            }
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
        // First try to get the cohort directory
        if let Some(cohort_dir) = &self.pt_template_dir_path {
            return Ok(cohort_dir.clone());
        }
        // Fall back to user's home directory
        let home_dir = env::var("HOME")
            .or_else(|_| env::var("USERPROFILE")) // Windows fallback
            .map_err(|_| "Failed to get home directory".to_string())?;
        
        Ok(PathBuf::from(home_dir))
    }

    fn get_phenopackets_output_dir(&self) -> Result<PathBuf, String> {
        let default_dir = self.get_default_dir()?;
        println!("default_dir {:?}", default_dir);

        // Try to open file dialog
        FileDialog::new()
            .set_directory(default_dir)
            .set_title("Select Output Directory")
            .pick_folder()
            .ok_or_else(|| "User canceled or dialog failed".to_string())
    }

    /// Export a list of phenopackets derived from the cohort.
    pub fn export_ppkt(
        &mut self,
        cohort_dto: CohortData) -> Result<String, String> {
        let out_dir = match self.get_phenopackets_output_dir() {
            Ok(dir) => dir,
            Err(e) =>  { return Err(e);},
        };
        let orcid = match self.settings.get_biocurator_orcid() {
            Ok(orcid_id) => orcid_id,
            Err(e) => { return Err(format!("Cannot save phenopackets without ORCID id: {}", e)); }
        };
        println!("{}{}: cohort={:?}", file!(), line!(), cohort_dto);
        match &self.ontology {
            Some(hpo) =>  ga4ghphetools::ppkt::write_phenopackets(cohort_dto, out_dir, orcid, hpo.clone()),
            None => Err("Cannot export phenopackets because HPO not initialized".to_string()),
        }
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
            Ok(orcid_id) => orcid_id,
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
        cohort_type: CohortType
    ) -> Result<CohortData, String> {
        let hpo = match &self.ontology {
            Some(onto) => onto.clone(),
            None => { return Err("HPO object not initialized".to_string()); }
        };
        ga4ghphetools::factory::create_new_cohort_data(cohort_type, dto,  hpo)     
    }


    pub async fn get_pmid_dto(input: &str) -> Result<PmidDto, String> {
        let retriever = PubmedRetriever::new(input)?;
        retriever.get().await
    }
    
    pub fn get_hpo_parent_and_children_terms(
        &self,
        annotation: HpoAnnotationDto) 
        -> ParentChildDto 
    {
        let hpo = match &self.ontology {
            Some(hpo) => hpo,
            None => return ParentChildDto::default(),
        };
        let tid = match TermId::from_str(&annotation.term_id) {
            Ok(tid) => tid,
            Err(_) => return ParentChildDto::default(), // should never happen
        };
        let children: Vec<HpoAnnotationDto> = hpo.iter_child_ids(&tid)
            .filter_map(|child_tid| {
                hpo.term_by_id(child_tid).map(|term| HpoAnnotationDto {
                    term_id: child_tid.to_string(),
                    label: term.name().to_string(),
                    is_observed: annotation.is_observed,
                    onset_string: annotation.onset_string.clone()
                })
            })
            .collect();
        let parents: Vec<HpoAnnotationDto> = hpo.iter_parent_ids(&tid)
            .filter_map(|parent_tid| {
                hpo.term_by_id(parent_tid).map(|term| HpoAnnotationDto {
                    term_id: parent_tid.to_string(),
                    label: term.name().to_string(),
                    is_observed: annotation.is_observed,
                    onset_string: annotation.onset_string.clone(),
                })
            })
            .collect();

        ParentChildDto { parents: parents, children: children }
    }

    pub fn get_autocompleted_term_dto(&self,
            term_id: impl Into<String>,
            term_label: impl Into<String>) -> Result<TextAnnotationDto, String> {
        let hpo = match &self.ontology {
            Some(hpo) => hpo,
            None => { return Err(format!("HPO not initialized"));},
        };
        let term_id = term_id.into();
        let hpo_id = match TermId::from_str(&term_id){
            Ok(tid) => tid,
            Err(e) => { return Err(format!("Could not create TermId: {}", e));},
        };
        let hpo_term = match hpo.term_by_id(&hpo_id) {
            Some(term) => term,
            None => { return Err(format!("Could not find term for TermId: {}", &hpo_id));},
        };
        let hpo_label: String = term_label.into();
        if hpo_term.name() != hpo_label {
            return Err(format!("Submitted label '{}' did not match label expected '{}' for TermId: {}", 
            &hpo_label,
            &hpo_term.name(),
            &hpo_id));
        };
        Ok(TextAnnotationDto::autocompleted_fenominal_hit(&term_id, &hpo_label))
    }

    pub fn get_biocurator_orcid(&self) -> Result<String, String> {
       self.settings.get_biocurator_orcid()
    }

    pub fn save_biocurator_orcid(&mut self, orcid: String) -> Result<(), String> {
        self.settings.save_biocurator_orcid(orcid)
    }

    pub fn get_variant_analysis(
        &self,
        cohort_dto: CohortData
    ) -> Result<Vec<VariantDto>, String> {
        ga4ghphetools::variant::analyze_variants(cohort_dto)
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

 


}


impl Default for PhenoboardSingleton {
    fn default() -> Self {
        Self { 
            settings: HpoCuratorSettings::load_settings(), 
            ontology: None, 
            pt_template_path: None, 
            pt_template_dir_path: None,
            hpo_auto_complete: vec![],
        }
    }
}
