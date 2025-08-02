//! This module creates a singleton object that we use to coordinate analysis across the application
//!
//! Each table cell is modelled as having the ability to return a datatype and the contents as a String
//! We garantee that if these objects are created, then we are ready to create phenopackets.

use crate::{directory_manager::DirectoryManager, dto::{pmid_dto::PmidDto, text_annotation_dto::{ParentChildDto, TextAnnotationDto}}, hpo::hpo_version_checker::{HpoVersionChecker, OntoliusHpoVersionChecker}, settings::HpoCuratorSettings, util::{self, io_util::select_or_create_folder, pubmed_retrieval::PubmedRetriever}};
use std::{fs::File, io::Write, path::{Path, PathBuf}, str::FromStr, sync::Arc};

use fuzzy_matcher::{skim::SkimMatcherV2, FuzzyMatcher};
use ontolius::{common::hpo::PHENOTYPIC_ABNORMALITY, io::OntologyLoaderBuilder, ontology::{csr::FullCsrOntology, HierarchyWalks, MetadataAware, OntologyTerms}, term::{MinimalTerm}, TermId};
use fenominal::{
    fenominal::{Fenominal, FenominalHit}
};
use ga4ghphetools::{dto::{etl_dto::ColumnTableDto, hpo_term_dto::HpoTermDto, template_dto::{DiseaseGeneDto, GeneVariantBundleDto, IndividualBundleDto, TemplateDto}, validation_errors::ValidationErrors, variant_dto::VariantDto}, PheTools};
use rfd::FileDialog;
use crate::dto::status_dto::StatusDto;


pub enum PptOperation {
    ShowColumn,
    ShowRow,
    EntireTable,
}

/// A singleton that coordinates all interactions with the backend (including GA4GH Phenoboard)
pub struct PhenoboardSingleton {
    settings: HpoCuratorSettings,
    /// Human Phenotype Ontology
    ontology: Option<Arc<FullCsrOntology>>,
    /// Path to save the phetools template
    pt_template_path: Option<String>,
    /// PheTools is the heart of the application.
    phetools: Option<PheTools>,
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
        let hpo_clone = Arc::clone(&ontology);
        self.ontology = Some(ontology);
        let phetools = PheTools::new(hpo_clone);
        self.phetools = Some(phetools);
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


    /// The template files are located in a subsub directory of the project directory.
    /// This function retrieves a PathBuf that points to the project directory.
    fn get_grandparent_dir(file_path: &str) -> Option<PathBuf> {
        let path = Path::new(file_path);
        path.parent()?.parent().map(|p| p.to_path_buf())
    }


    /// Load an excel file containing a phetools template (version 1). Use this to initialize the Phetools backend
    /// * Arguments
    /// 
    /// - `excel_file` - the template file
    /// - `fix errors` - attempt to fix errors including outdated HPO ids or labels and stray-whitespace errors
    /// 
    /// * Returns
    /// - Ok(()) if successful, list of errors (strings) otherwise
    pub fn load_excel_template(
        &mut self, 
        excel_file: &str,
        fix_errors: bool) -> Result<TemplateDto, Vec<String>> {
        match self.phetools.as_mut() {
            Some(ptools) => match ptools.load_excel_template(excel_file, fix_errors) {
                Ok(dto) => {
                    self.pt_template_path = Some(excel_file.to_string());
                    let project_dir = Self::get_grandparent_dir(excel_file);
                    if project_dir.is_none() {
                        return Err(vec![format!("Could not load project directory for {excel_file}")]);
                    }
                    let project_dir = project_dir.unwrap();
                    match ptools.initialize_project_dir(project_dir) {
                        Ok(_) => Ok(dto),
                        Err(e) => Err(vec![e]),
                    }
                }
                Err(msg) => {
                    return Err(msg);
                }
            },
            None => return Err(vec!["Could not load excel file since Phetools was not initialized. Did you load HPO?".to_string()]),
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
        status.n_phenopackets = self.phenopacket_count();
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
            None => {return Err(format!("Template prent path not initialized"));},
        };
        let dirman = DirectoryManager::new(parent.to_string_lossy())?;
        return dirman.get_json();
    }


    pub fn check_readiness(&self) -> bool {
        return self.ontology.is_some() && self.pt_template_path.is_some();
    }

    pub fn hpo_ready(&self) -> bool {
        self.ontology.is_some()
    }

    /// Use our rust fenominal implementation to perform HPO text mining.
    /// 
    /// * Arguments
    /// `input_text` - Generally, a clinical text that contains HPO terms
    /// 
    /// * Returns: A list of  representing the fenominal hits.
    pub fn map_text_to_annotations(&self, input_text: &str) -> Result<Vec<TextAnnotationDto>, String> {
        match self.get_sorted_fenominal_hits(input_text) {
            Ok(fenominal_hits) => {
                return util::text_to_annotation::text_to_annotations(input_text, &fenominal_hits);
            },
            Err(e) => {return Err(e.to_string()); },
        }
    }

    /// Run fenominal and sort the results by span.
    fn get_sorted_fenominal_hits(&self, input_text: &str) 
        -> Result<Vec<FenominalHit>, String>
    {
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = Arc::clone(hpo);
                let fenominal = Fenominal::new(hpo_arc);
                let mut fenominal_hits: Vec<FenominalHit> = fenominal.process(&input_text);
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
                let hpo_arc = Arc::clone(hpo);
                let phetools = PheTools::new(hpo_arc);
                let fenom_hits: Vec<FenominalHit> = fenominal.process(input_text);
                let mut tid_list: Vec<TermId> = Vec::new();
                for hit in fenom_hits {
                    // Fenominal hit.term_id can be unwrapped
                    let tid = TermId::from_str(&hit.term_id).unwrap();
                    tid_list.push(tid);
                }
                let ordered_hpo_ids = phetools.arrange_terms(&tid_list);
                return ordered_hpo_ids;
            }
            None => {
                return vec![];
            }
        }
    }



    pub fn hpo_initialized(&self) -> bool {
        match &self.ontology {
            Some(_) => true,
            None => false,
        }
    }

    /// TODO Refactor
    pub fn phenopacket_count(&self) -> usize {
  
       /*match &self.phetools {
            Some(ptools) => ptools.nrows() -2,
            None => 0,
        }*/
        0
    }


    pub fn validate_template(
        &self, 
        cohort_dto: TemplateDto) 
    -> Result<(), Vec<String>> {
        match &self.phetools {
            Some(ptools) => {
                let _template = ptools.validate_template(&cohort_dto)?;
                return Ok(());
            },
            None => {
                Err(vec!["Phetools template not initialized".to_string()])
            },
        }
    }


    fn get_default_template_dir(&self) -> Option<PathBuf> {
        match &self.phetools {
            Some(phetools) => {
                phetools.get_default_cohort_dir().map(|mut dir| {
                    dir.push("input");
                    dir
                })
            },
            None => None,
        }
    }

    fn save_template_json(&self, template: &TemplateDto) -> Result<(), String> {
        let dir_opt = self.get_default_template_dir();
        if dir_opt.is_none() {
            return Err("Could not get default path".to_string());
        }
        let default_dir = dir_opt.unwrap();
        let save_path: Option<PathBuf> = FileDialog::new()
            .set_directory(default_dir)
            .set_title("Save PheTools JSON template")
            .set_file_name("template.json")
            .save_file();

        if let Some(path) = save_path {
            // Serialize DTO to JSON string
            let json = serde_json::to_string_pretty(&template).map_err(|_|"Could not serialize to JSON".to_string())?;
            let mut file = File::create(&path).map_err(|_|"Could not create file".to_string())?;
            file.write_all(json.as_bytes()).map_err(|_|"Could not write file".to_string())?;

            println!("Saved JSON to {:?}", path);
        } else {
            println!("Save cancelled by user");
        }

        Ok(())
    }

    pub fn save_template(
        &mut self, 
        cohort_dto: &TemplateDto) 
    -> Result<(), Vec<String>> {
        let mut verrs = ValidationErrors::new();
        match self.phetools.as_mut() {
            Some(ptools) => {
                ptools.save_template(cohort_dto)?;
                match self.save_template_json(cohort_dto){
                    Ok(_) => Ok(()),
                    Err(e) => Err(vec![e]),
                }
            },
            None => {
                verrs.push_str("Phetools template not initialized");
                Err(verrs.errors())
            },
        }
    }

    fn get_phenopackets_output_dir(&self) -> Option<PathBuf> {
        let default_dir = self.phetools.as_ref()?.get_default_cohort_dir().map(|mut dir| {
            dir.push("phenopackets");
            dir
        })?;

        FileDialog::new()
            .set_directory(default_dir)
            .set_title("Select Output Directory for Phenopackets")
            .pick_folder()
    }

    pub fn export_ppkt(
        &mut self,
        cohort_dto: TemplateDto) -> Result<(), String> {
        let out_dir = match self.get_phenopackets_output_dir() {
            Some(dir) => dir,
            None =>  { return Err("Could not get phenopackets output directory".to_string());},
        };
        match self.phetools.as_mut() {
            Some(ptools) => {
                ptools.write_ppkt_list(cohort_dto, out_dir)
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
        cohort_dto: TemplateDto) 
    -> std::result::Result<TemplateDto, Vec<String>> {
        match self.phetools.as_mut() {
            Some(ptools) => {
                ptools.add_hpo_term_to_cohort(hpo_id, hpo_label, cohort_dto)
            },
            None => {
                Err(vec!["Phenotype template not initialized".to_string()])
            },
        }
    }

    /// Add a new phenopacket (row) to the cohort
    pub fn add_new_row_to_cohort(
        &mut self,
        individual_dto: IndividualBundleDto, 
        hpo_annotations: Vec<HpoTermDto>,
        gene_variant_list: Vec<GeneVariantBundleDto>,
        disease_gene_dto: DiseaseGeneDto,
        template_dto: TemplateDto) 
    -> std::result::Result<TemplateDto, Vec<String>> {
        match self.phetools.as_mut() {
            Some(ptools) => {
                let updated_dto = ptools.add_new_row_to_cohort(
                    individual_dto, 
                    hpo_annotations, 
                    gene_variant_list, 
                    disease_gene_dto,
                    template_dto)?;
                Ok(updated_dto)
            },
            None => {
                Err(vec!["Phenotype template not initialized".to_string()])
            },
        }
    }

    /// Generate a Template from seed HPO terms.
    /// This method will create a new Phetools object and discard the previous one, if any.
    /// ToDo, this is Mendelian only, we need to extend it.
    pub fn create_template_dto_from_seeds(
        &mut self,
        dto: DiseaseGeneDto,
        input: String
    ) -> Result<TemplateDto, String> {
        println!("{}:{} - input {}", file!(), line!(), &input);
        let fresult = self.map_text_to_term_list(&input);
        let template_type = dto.template_type;
        let directory = select_or_create_folder()?;
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = Arc::clone(hpo);
                let mut phetools = PheTools::new(hpo_arc);
                let dgdto = phetools.create_pyphetools_template_from_seeds(
                    template_type,
                    directory,
                    fresult,
                )?;
                self.phetools = Some(phetools);
                return Ok(dgdto);
            },
            None =>  Err(format!("Could not retrieve ontology"))
            }
    }


    pub async fn get_pmid_dto(input: &str) -> Result<PmidDto, String> {
        let retriever = PubmedRetriever::new(input)?;
        retriever.get().await
    }
    
    pub fn get_hpo_parent_and_children_terms(
        &self,
        annotation: TextAnnotationDto) 
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
        let children: Vec<TextAnnotationDto> = hpo.iter_child_ids(&tid)
            .filter_map(|child_tid| {
                hpo.term_by_id(child_tid).map(|term| TextAnnotationDto {
                    term_id: child_tid.to_string(),
                    label: term.name().to_string(),
                    ..Default::default()
                })
            })
            .collect();
        let parents: Vec<TextAnnotationDto> = hpo.iter_parent_ids(&tid)
            .filter_map(|parent_tid| {
                hpo.term_by_id(parent_tid).map(|term| TextAnnotationDto {
                    term_id: parent_tid.to_string(),
                    label: term.name().to_string(),
                    ..Default::default()
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


    /// Todo better documentation
    pub fn get_phetools_template(&self) -> Result<TemplateDto, String> {
        match &self.phetools {
            Some(phetools) => phetools.get_template_dto(),
            None => Err(format!("{}:{}-phetools not initialized", file!(), line!())),
        }
    }


    pub fn validate_variant_list_dto(
        &mut self,
        variant_dto_list: Vec<VariantDto>) 
    -> Result<Vec<VariantDto>, String> {
        match self.phetools.as_mut() {
            Some(phetools) => phetools.validate_variant_dto_list( variant_dto_list),
            None => Err(format!("phetools not initialized")),
        }
    }

    pub fn submit_variant_dto(&mut self, dto: VariantDto) -> Result<VariantDto, String> {
        match self.phetools.as_mut() {
            Some(phetools) => phetools.validate_variant(dto),
            None => Err(format!("phetools not initialized")),
        }
    }

    pub fn load_external_excel(&mut self, external_excel_file: &str, row_based: bool) 
    -> Result<ColumnTableDto, String> {
        match self.phetools.as_mut() {
            Some(phetools) => phetools.load_external_excel(external_excel_file, row_based),
            None => Err(format!("phetools not initialized")),
        }
    }

    pub fn set_external_template_dto(&mut self, dto: &ColumnTableDto) -> Result<(), String> {
        match self.phetools.as_mut() {
            Some(phetools) => phetools.set_external_template_dto(dto),
            None => Err(format!("phetools not initialized")),
        }
    }
}


impl Default for PhenoboardSingleton {
    fn default() -> Self {
        Self { 
            settings: HpoCuratorSettings::load_settings(), 
            ontology: None, 
            pt_template_path: None, 
            phetools: None, 
            hpo_auto_complete: vec![],
        }
    }
}
