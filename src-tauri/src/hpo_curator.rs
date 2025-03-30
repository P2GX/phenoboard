//! This module creates a singleton object that we use to coordinate analysis across the application
//!
//! Each table cell is modelled as having the ability to return a datatype and the contents as a String
//! We garantee that if these objects are created, then we are ready to create phenopackets.

use crate::ppt_table::PptEditTable;
use crate::settings::HpoCuratorSettings;
use ontolius::TermId;
use ontolius::{
    io::OntologyLoaderBuilder,
    ontology::csr::FullCsrOntology
};
use rfenominal::{
    fenominal::{Fenominal, FenominalHit},
    TextMiner,
};
use rphetools::PheTools;
use std::sync::Mutex;
use tauri::State;

/// A singleton
pub struct HpoCuratorSingleton {
    settings: HpoCuratorSettings,
    ontology: Option<FullCsrOntology>,
    hp_json_path: Option<String>,
    edit_table: Option<PptEditTable>
}

impl HpoCuratorSingleton {
    pub fn new() -> Self {
        HpoCuratorSingleton {
            settings: HpoCuratorSettings::from_settings().unwrap(), // todo better error handling. Figure out what to do if file does not exist yet
            ontology: None,
            hp_json_path: None,
            edit_table: None,
        }
    }

    pub fn set_hpo(&mut self, ontology: FullCsrOntology) {
        self.ontology = Some(ontology);
    }

    pub fn set_hp_hson(&mut self, hp_json: &str) {
        self.hp_json_path = Some(hp_json.to_string());
    }

    pub fn load_hp_json_file(&mut self, hp_json: &str) -> Result<(), String> {
        let loader = OntologyLoaderBuilder::new().obographs_parser().build();
        self.set_hp_hson(hp_json);
        match &self.hp_json_path {
            Some(hp_json) => {
                let hpo: FullCsrOntology =
                    loader.load_from_path(hp_json).expect("Ontolius HPO loader failed");
                self.ontology = Some(hpo);
                Ok(())
            }
            None => Err("Could not load ontology".to_string()),
        }
    }

    pub fn hp_json_path(&self) -> Result<String, String> {
        match &self.hp_json_path {
            Some(hp_json) => Ok(hp_json.to_string()),
            None => Err("hp.json not initialized".to_string())
        }
    }

    pub fn edit_table(&mut self) -> Option<&mut PptEditTable> {
        self.edit_table.as_mut()
    }

    pub fn get_hpo_version(&self) -> Result<String, String> {
        match &self.ontology {
            Some(hpo) => Ok("hpo_curator (l. 72) needs update (ontolius)".to_string()),
            None => Err("HPO not initialized".to_string())
        }
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

    pub fn set_edit_table(&mut self, table: Vec<Vec<String>>) {
        let result = PptEditTable::new(table);
        match result {
            Ok(table) =>  {self.edit_table = Some(table); },
            Err(e) => { eprint!("Could not create PPT Edit table {:?}", e); }
        } 
    }

    /// The GUI will allow the user to set the value of a specific cell.
    pub fn set_table_cell<T>(&mut self, r: usize, c: usize, val: T) -> Result<(), String>
        where T: Into<String> {
        match self.edit_table.as_mut() {
            Some(table) => {
                table.set_value(r,c,val);
                Ok(())
            },
            None => {
                Err(format!("Attempt to set uninitialized table"))
            }
        } 
    }

    pub fn hpo_initialized(&self) -> bool {
        match &self.ontology {
            Some(hpo) => true,
            None => false     
        }
    }

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
    let mut singleton = singleton.lock().unwrap();
    let fresult = singleton.map_text_to_term_list(input_text);
    print!("hpo_curator: We got {} term ids from seed", fresult.len());
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
                    singleton.set_edit_table(matrix);
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
