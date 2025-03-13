//! This module creates a singleton object that we use to coordinate analysis across the application
//!
//! Each table cell is modelled as having the ability to return a datatype and the contents as a String
//! We garantee that if these objects are created, then we are ready to create phenopackets.


use rfenominal::fenominal::Fenominal;
use ontolius::{base::{term::simple::SimpleMinimalTerm, TermId}, io::OntologyLoaderBuilder, ontology::csr::MinimalCsrOntology, prelude::MetadataAware};
use rphetools::{hpo::hpo_term_arranger::HpoTermArranger, template_creator::TemplateCreator, rphetools_traits::PyphetoolsTemplateCreator};
use tauri::State;
use std::sync::Mutex;
use crate::settings::HpoCuratorSettings;

/// A singleton
pub struct HpoCuratorSingleton {
    settings: HpoCuratorSettings,
    ontology: Option<MinimalCsrOntology>,
    hp_json_path: Option<String>,
    fenominal: Option<Fenominal>
    
}

impl HpoCuratorSingleton {
    pub fn new() -> Self {
        HpoCuratorSingleton {
            settings: HpoCuratorSettings::from_settings().unwrap(), // todo better error handling. Figure out what to do if file does not exist yet
            ontology: None,
            hp_json_path: None,
            fenominal: None
        }
    }

    pub fn set_hpo(&mut self, ontology: MinimalCsrOntology) {
        self.ontology = Some(ontology);
    }

    pub fn set_hp_hson(&mut self, hp_json: &str) {
        self.hp_json_path = Some(hp_json.to_string());
    }

    pub fn initialize_hpo_and_get_version(&mut self) -> Result<String,String> {
        let loader = OntologyLoaderBuilder::new()
            .obographs_parser()
            .build();
        match &self.hp_json_path {
            Some(hp_json) => {
                let hpo: MinimalCsrOntology = loader.load_from_path(hp_json).expect("could not unwrap");
                let version =  hpo.version().to_string();
                let fenominal = Fenominal::new(hp_json);
                self.ontology = Some(hpo);
                self.fenominal = Some(fenominal);
                Ok(version) 
            },
            None => {
                Err("Could not load ontology".to_string())
            }
        }
    }

    pub fn hp_json_path(&self) -> Option<&str> {
        self.hp_json_path.as_deref()
    }


    /// TODO figure out error handling
    pub fn map_text(&self, input_text: &str) -> String {

        match &self.fenominal {
            Some(fenominal) => {
                let json_string = fenominal.map_text_to_json(&input_text);
                println!("{}", &json_string);
                json_string
            },
            None => {
                "No mapper found".to_ascii_lowercase()
            }
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
    pub fn map_text_to_term_list(&self, input_text: &str) -> Vec<TermId> {
        match &self.fenominal {
            Some(fenominal) => {
                let fenom_hits = fenominal.map_text_to_term_id_set(input_text);
                match &self.ontology {
                    Some(hpo) => {
                        let hpo_ids = fenom_hits.into_iter().collect();
                        let mut arranger = HpoTermArranger::new(&hpo);
                        let ordered_hpo_ids = arranger.arrange_terms(&hpo_ids);
                        return ordered_hpo_ids;
                    },
                    None => vec![]
                }
            },
            None => vec![]  
        }
    }

}


#[tauri::command]
pub fn initialize_hpo_and_get_version(singleton: State<Mutex<HpoCuratorSingleton>>)-> Result<String, String> {
    let mut singleton = singleton.lock().unwrap();
    let result: Result<String, String> = singleton.initialize_hpo_and_get_version();

    result
}



/// When we initialize a new Table (Excel file) for curation, we start with
/// a text that contains candidate HPO terms for curation.
/// This function performs text mining on that text and creates
/// a Matrix of Strings with which we initialize the table in the GUI
/// TODO: better documentation
#[tauri::command]
pub fn get_table_columns_from_seeds(singleton: State<Mutex<HpoCuratorSingleton>>,
                                    disease_id: &str,
                                    disease_name: &str,
                                    hgnc_id: &str,
                                    gene_symbol: &str,
                                    transcript_id: &str,
                                    input_text: &str) -> Result<String, String> {
    let mut singleton = singleton.lock().unwrap();
    let fresult = singleton.map_text_to_term_list(input_text);
    let term_list: Vec<SimpleMinimalTerm> = vec![];
    for hpo_tid in fresult {

    }

    match &singleton.ontology {
        Some(hpo) => {
            // Get list of HPO term ids
            let term_list: Vec<SimpleMinimalTerm> = vec![];
            for hpo_tid in fresult {
                //let hpo_term = hpo.i
            }


            let result = TemplateCreator::create_pyphetools_template(
                disease_id,
                disease_name,
                hgnc_id,
                gene_symbol,
                transcript_id,
                term_list,
                &hpo
            );
            match result {
                Ok(matrix) => { 
                    let json_string = serde_json::to_string(&matrix).unwrap();
                    return Ok(json_string);
                },
                Err(e) => {
                    return Err(format!("Could not create matrix: {}", e));
                }
            }
        }, 
        None => {
            return Err(format!("Could not retrieve ontology"));
        }
    }
}
