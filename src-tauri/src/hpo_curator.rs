//! This module creates a singleton object that we use to coordinate analysis across the application
//!
//! Each table cell is modelled as having the ability to return a datatype and the contents as a String
//! We garantee that if these objects are created, then we are ready to create phenopackets.

use crate::settings::HpoCuratorSettings;
use ontolius::TermId;
use ontolius::{
    io::OntologyLoaderBuilder,
    ontology::{csr::FullCsrOntology, MetadataAware, OntologyTerms},
    term::{
        simple::{SimpleMinimalTerm, SimpleTerm},
        MinimalTerm,
    },
};
use rfenominal::{
    fenominal::{self, Fenominal, FenominalHit},
    TextMiner,
};
use rphetools::PheTools;
use std::sync::Arc;
use std::sync::Mutex;
use tauri::State;

/// A singleton
pub struct HpoCuratorSingleton {
    settings: HpoCuratorSettings,
    ontology: Option<FullCsrOntology>,
    hp_json_path: Option<String>,
}

impl HpoCuratorSingleton {
    pub fn new() -> Self {
        HpoCuratorSingleton {
            settings: HpoCuratorSettings::from_settings().unwrap(), // todo better error handling. Figure out what to do if file does not exist yet
            ontology: None,
            hp_json_path: None,
        }
    }

    pub fn set_hpo(&mut self, ontology: FullCsrOntology) {
        self.ontology = Some(ontology);
    }

    pub fn set_hp_hson(&mut self, hp_json: &str) {
        self.hp_json_path = Some(hp_json.to_string());
    }

    pub fn load_hpo_and_get_version(&mut self, hp_json: &str) -> Result<String, String> {
        let loader = OntologyLoaderBuilder::new().obographs_parser().build();
        self.set_hp_hson(hp_json);
        match &self.hp_json_path {
            Some(hp_json) => {
                let hpo: FullCsrOntology =
                    loader.load_from_path(hp_json).expect("could not unwrap");
                let version = "update after ontolius update".to_string();//hpo.version().to_string();
                self.ontology = Some(hpo);
                Ok(version)
            }
            None => Err("Could not load ontology".to_string()),
        }
    }

    pub fn hp_json_path(&self) -> Option<&str> {
        self.hp_json_path.as_deref()
    }

    /// TODO figure out error handling
    pub fn map_text(&self, input_text: &str) -> String {
        match &self.ontology {
            Some(hpo) => {
                let fenominal = Fenominal::from(hpo);
                let fenominal_hits: Vec<FenominalHit> = fenominal.process(&input_text);
                let json_string = serde_json::to_string(&fenominal_hits).unwrap();
                json_string
            }
            None => format!("Could not initialize hpo"),
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
        match &self.ontology {
            Some(hpo) => {
                let fenominal = Fenominal::from(hpo);
                let fenom_hits: Vec<TermId> = fenominal.process(input_text);
                let phetools = PheTools::new(hpo);
                let ordered_hpo_ids = phetools.arrange_terms(&fenom_hits);
                return ordered_hpo_ids;
            }
            None => {
                vec![]
            }
        }
    }
}

#[tauri::command]
pub fn initialize_hpo_and_get_version(
    singleton: State<Mutex<HpoCuratorSingleton>>,
    hpo_json_path: &str,
) -> Result<String, String> {
    let mut singleton = singleton.lock().unwrap();
    let result: Result<String, String> = singleton.load_hpo_and_get_version(hpo_json_path);

    result
}

/// When we initialize a new Table (Excel file) for curation, we start with
/// a text that contains candidate HPO terms for curation.
/// This function performs text mining on that text and creates
/// a Matrix of Strings with which we initialize the table in the GUI
/// TODO: better documentation
#[tauri::command]
pub fn get_table_columns_from_seeds(
    singleton: State<Mutex<HpoCuratorSingleton>>,
    disease_id: &str,
    disease_name: &str,
    hgnc_id: &str,
    gene_symbol: &str,
    transcript_id: &str,
    input_text: &str,
) -> Result<String, String> {
    let singleton = singleton.lock().unwrap();
    let fresult = singleton.map_text_to_term_list(input_text);
    match &singleton.ontology {
        Some(hpo) => {
            let phetools = PheTools::new(&hpo);
            let result = phetools.create_pyphetools_template(
                disease_id,
                disease_name,
                hgnc_id,
                gene_symbol,
                transcript_id,
                fresult,
            );
            match result {
                Ok(matrix) => {
                    let json_string = serde_json::to_string(&matrix).unwrap();
                    return Ok(json_string);
                }
                Err(e) => {
                    return Err(format!("Could not create matrix: {}", e));
                }
            }
        }
        None => {
            return Err(format!("Could not retrieve ontology"));
        }
    }
}
