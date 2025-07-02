//! This module creates a singleton object that we use to coordinate analysis across the application
//!
//! Each table cell is modelled as having the ability to return a datatype and the contents as a String
//! We garantee that if these objects are created, then we are ready to create phenopackets.

use crate::{directory_manager::DirectoryManager, dto::{pmid_dto::PmidDto, text_annotation_dto::{ParentChildDto, TextAnnotationDto}}, hpo::hpo_version_checker::{HpoVersionChecker, OntoliusHpoVersionChecker}, settings::HpoCuratorSettings, util::{self}};
use std::{collections::HashMap, path::Path, str::FromStr, sync::Arc};

use ontolius::{common::hpo::PHENOTYPIC_ABNORMALITY, io::OntologyLoaderBuilder, ontology::{csr::FullCsrOntology, HierarchyWalks, MetadataAware, OntologyTerms}, term::{MinimalTerm}, TermId};
use fenominal::{
    fenominal::{Fenominal, FenominalHit}
};
use ga4ghphetools::{dto::{template_dto::TemplateDto, validation_errors::ValidationErrors}, PheTools};
use crate::dto::status_dto::StatusDto;
use crate::util::pubmed_retrieval::PubmedRetriever;

pub enum PptOperation {
    ShowColumn,
    ShowRow,
    EntireTable,
}

/// A singleton
pub struct PhenoboardSingleton {
    settings: HpoCuratorSettings,
    /// Human Phenotype Ontology
    ontology: Option<Arc<FullCsrOntology>>,
    /// Path to save the phetools template
    pt_template_path: Option<String>,
    /// PheTools is the heart of the application.
    phetools: Option<PheTools>,
    current_row: Option<usize>,
    current_column: Option<usize>,
    current_operation: PptOperation,
    /// this value is true if there are changes we have not yet saved to file
    unsaved: bool,
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
            singleton.ontology = Some(hpo_arc);
            singleton.initialize_hpo_autocomplete();
        }           
        return singleton;
    }



    pub fn set_hpo(&mut self, ontology: Arc<FullCsrOntology>) {
        let hpo_clone = Arc::clone(&ontology);
        self.ontology = Some(ontology);
        let phetools = PheTools::new(hpo_clone);
        self.phetools = Some(phetools);
    }

    pub fn set_hp_json(&mut self, hp_json: &str) -> Result<(), String>{
        self.settings.set_hp_json_path(hp_json)?;
        Ok(())
    }

    /// Set the path to the phenotools template we will input or create
    /// TODO better handling of vector of errors
    pub fn set_pt_template_path(&mut self, template_path: &str) -> Result<(), String> {
        self.pt_template_path = Some(template_path.to_string());
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = Arc::clone(hpo);
                let phetools = PheTools::new(hpo_arc);
                self.phetools = Some(phetools);
                self.load_excel_template(template_path)?;
                Ok(())
            }
            None => Err(format!("HPO not initialized")),
        }
    }

    pub fn load_hp_json_file(&mut self, hp_json: &str) -> Result<(), String> {
        let loader = OntologyLoaderBuilder::new().obographs_parser().build();
        self.set_hp_json(hp_json)?;
        match &self.settings.get_hp_json_path() {
            Ok(hp_json) => {
                let hpo: FullCsrOntology = loader
                    .load_from_path(hp_json)
                    .expect("Ontolius HPO loader failed");
                let hpo_arc = Arc::new(hpo);
                self.ontology = Some(hpo_arc);
            }
            Err(e) => { return Err(e.clone()); },
        };
        self.initialize_hpo_autocomplete();
        Ok(())
    }

    /// Provide Strings with TermId - Label that will be used for autocompletion
    pub fn get_hpo_autocomplete(&self) -> &Vec<String> {
        &self.hpo_auto_complete
    }

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

  

    pub fn get_hpo_version(&self) -> Result<String, String> {
        match &self.ontology {
            Some(hpo) => Ok(hpo.version().to_string()),
            None => Err("HPO not initialized".to_string()),
        }
    }

    pub fn n_hpo_terms(&self) -> Result<usize, String> {
        match &self.ontology {
            Some(hpo) => Ok(hpo.len()),
            None => Err("HPO not initialized".to_string()),
        }
    }


    pub fn load_excel_template(&mut self, excel_file: &str) -> Result<(), String> {
        match self.phetools.as_mut() {
            Some(ptools) => match ptools.load_excel_template(excel_file) {
                Ok(_) => {
                    self.pt_template_path = Some(excel_file.to_string());
                    return Ok(());
                }
                Err(msg) => {
                    return Err(msg);
                }
            },
            None => return Err(format!("Could not load excel file since Phetools was not initialized. Did you load HPO?")),
        }
    }

    pub fn get_template_summary(&self) 
        -> Result<HashMap<String,String>, String> 
    {
        match &self.phetools {
            Some(ptools) => ptools.get_template_summary(),
            None => Err(format!("Phetools template not initialized"))
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

    /// TODO figure out error handling
    pub fn map_text(&self, input_text: &str) -> String {
        match self.get_sorted_fenominal_hits(input_text) {
            Ok(fenominal_hits) => {
                return serde_json::to_string(&fenominal_hits).unwrap();
            },
            Err(e) => {return e.to_string() },
        }
    }

    pub fn map_text_to_annotations(&self, input_text: &str) -> Result<Vec<TextAnnotationDto>, String> {
        match self.get_sorted_fenominal_hits(input_text) {
            Ok(fenominal_hits) => {
                return util::text_to_annotation::text_to_annotations(input_text, &fenominal_hits);
            },
            Err(e) => {return Err(e.to_string()); },
        }
    }

    pub fn get_sorted_fenominal_hits(&self, input_text: &str) 
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
        42
       /*match &self.phetools {
            Some(ptools) => ptools.nrows() -2,
            None => 0,
        }*/
    }


    pub fn validate_template(
        &self, 
        cohort_dto: TemplateDto) 
    -> Result<(), ValidationErrors> {
        let mut verrs = ValidationErrors::new();
        match &self.phetools {
            Some(ptools) => {
                println!("TODO probably change API");
                let _template = ptools.validate_template(cohort_dto)?;
                return Ok(());
            },
            None => {
                verrs.push_str("Phetools template not initialized");
                Err(verrs)
            },
        }
    }
    pub fn add_hpo_term_to_cohort(
        &mut self,
        hpo_id: &str,
        hpo_label: &str) 
    -> std::result::Result<(), Vec<String>> {
        match self.phetools.as_mut() {
            Some(ptools) => {
                ptools.add_hpo_term_to_cohort(hpo_id, hpo_label)?;
                Ok(())
            },
            None => {
                Err(vec!["Phenotype template not initialized".to_string()])
            },
        }
    }

    pub fn get_table_columns_from_seeds(
        &mut self,
        disease_id: &str,
        disease_name: &str,
        hgnc_id: &str,
        gene_symbol: &str,
        transcript_id: &str,
        input_text: &str,
    ) -> Result<TemplateDto, String> {
        let fresult = self.map_text_to_term_list(input_text);
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = Arc::clone(hpo);
                let mut phetools = PheTools::new(hpo_arc);
                let result = phetools.create_pyphetools_template(
                    disease_id,
                    disease_name,
                    hgnc_id,
                    gene_symbol,
                    transcript_id,
                    fresult,
                );
                match result {
                    Ok(pt_template) => {
                        let template_dto = pt_template.get_template_dto();
                        return Ok(template_dto);
                    }
                    Err(e) => {
                        return Err(format!("Could not create matrix: {}", e));
                    }
                }
            }
            None => { return Err(format!("Could not retrieve ontology")); }
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
        }
        Ok(TextAnnotationDto::autocompleted_fenominal_hit(&term_id, &hpo_label))
    }

    /// Todo better documentation
    pub fn get_phetools_template(&self) -> Result<TemplateDto, String> {
        match &self.phetools {
            Some(phetools) => phetools.get_template_dto(),
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
            current_row: None, 
            current_column: None, 
            current_operation: PptOperation::EntireTable, 
            unsaved: false,
            hpo_auto_complete: vec![],
        }
    }
}
