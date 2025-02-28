//! This module creates a singleton object that we use to coordinate analysis across the application
//!
//! Each table cell is modelled as having the ability to return a datatype and the contents as a String
//! We garantee that if these objects are created, then we are ready to create phenopackets.


use ferriphene::fenominal::Fenominal;
use ontolius::{io::OntologyLoaderBuilder, ontology::csr::MinimalCsrOntology, prelude::MetadataAware};

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
            settings: HpoCuratorSettings::default(),
            ontology: None,
            hp_json_path: None,
            fenominal: None
        }
    }

    pub fn set_hpo(&mut self, ontology: MinimalCsrOntology) {
        self.ontology = Some(ontology)
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
                json_string
            },
            None => {
                "No mapper found".to_ascii_lowercase()
            }
        }

      
    }

    
}
