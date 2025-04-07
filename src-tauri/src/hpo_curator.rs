//! This module creates a singleton object that we use to coordinate analysis across the application
//!
//! Each table cell is modelled as having the ability to return a datatype and the contents as a String
//! We garantee that if these objects are created, then we are ready to create phenopackets.


use std::{clone, fmt::format, sync::Arc};
use crate::settings::HpoCuratorSettings;

use ontolius::{
    io::OntologyLoaderBuilder,
    ontology::csr::FullCsrOntology, TermId
};
use rfenominal::{
    fenominal::{Fenominal, FenominalHit},
    TextMiner,
};
use rphetools::PheTools;
use std::sync::Mutex;
use tauri::State;

pub enum PptOperation {
    ShowColumn,
    ShowRow,
    EntireTable,
}

/// A singleton
pub struct HpoCuratorSingleton {
    settings: HpoCuratorSettings,
    ontology: Option<Arc<FullCsrOntology>>,
    hp_json_path: Option<String>,
    pt_template_path: Option<String>,
    phetools: Option<PheTools>,
    current_row: Option<usize>, 
    current_column: Option<usize>, 
    current_operation: PptOperation,
    unsaved: bool,
}

impl HpoCuratorSingleton {
    pub fn new() -> Self {
        HpoCuratorSingleton {
            settings: HpoCuratorSettings::from_settings().unwrap(), // todo better error handling. Figure out what to do if file does not exist yet
            ontology: None,
            hp_json_path: None,
            pt_template_path: None,
            phetools: None,
            current_row: None,
            current_column: None,
            current_operation: PptOperation::EntireTable,
            unsaved: false,
        }
    }

    pub fn set_hpo(&mut self, ontology: Arc<FullCsrOntology>) {
        self.ontology = Some(ontology);
    }

    pub fn set_hp_hson(&mut self, hp_json: &str) {
        self.hp_json_path = Some(hp_json.to_string());
    }

    /// Set the path to the phenotools template we will input or create
    /// TODO better handling of vector of errors
    pub fn set_pt_template_path(&mut self, template_path: &str) 
        -> Result<(), String> 
       {
        self.pt_template_path = Some(template_path.to_string());
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = Arc::clone(hpo);
                let mut phetools = PheTools::new(hpo_arc);
                phetools.load_excel_template(template_path)
                    .map_err(|evec| evec.join("; "))?;
                self.phetools = Some(phetools);
               Ok(())
            },
            None => {Err(format!("HPO not initialized"))}
        }
       
    }

    pub fn load_hp_json_file(&mut self, hp_json: &str) -> Result<(), String> {
        let loader = OntologyLoaderBuilder::new().obographs_parser().build();
        self.set_hp_hson(hp_json);
        match &self.hp_json_path {
            Some(hp_json) => {
                let hpo: FullCsrOntology =
                    loader.load_from_path(hp_json).expect("Ontolius HPO loader failed");
                let hpo_arc = Arc::new(hpo);
                self.ontology = Some(hpo_arc);
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

    pub fn pt_template_path(&self) -> Result<String, String> {
        match &self.pt_template_path {
            Some(pt_template) => Ok(pt_template.to_string()),
            None => Err("phenotype template path not initialized".to_string())
        }
    }

   

    pub fn get_matrix(&self) -> Result<Vec<Vec<String>>, String> {
        match &self.phetools {
            Some(ptools) => {
                let matrix = ptools.get_string_matrix()?;
                Ok(matrix)
            },              
            None => Err(format!("Table not initialized"))
        }
    }

    pub fn get_hpo_version(&self) -> Result<String, String> {
        match &self.ontology {
            Some(_hpo) => Ok("hpo_curator (l. 72) needs update (ontolius)".to_string()),
            None => Err("HPO not initialized".to_string())
        }
    }

    pub fn get_row(&self, row: usize) -> Result<Vec<String>, String> {
        match &self.phetools {
            Some(ptools) => {
                let row = ptools.get_string_row(row)?;
                Ok(row)
            },
            None => Err(format!("Could not get row because Phetools was null"))
        }
       
    }

    pub fn new_row(&mut self, 
        pmid: impl Into<String>, 
        title: impl Into<String>, 
        individual_id: impl Into<String>) 
        -> Result<(), String> 
    {
        match &mut self.phetools {
            Some(ptools) => {
                ptools.add_row(pmid, title, individual_id)?;
                Ok(())
            },
            None =>  Err(format!("Phetools object not initialized"))
        }
    }

    pub fn new_row_with_pt(&mut self, 
        pmid: impl Into<String>, 
        title: impl Into<String>, 
        individual_id: impl Into<String>) 
        -> Result<(), String> 
    {
        match &mut self.phetools {
            Some(ptools) => {
                ptools.add_row(pmid, title, individual_id)?;
                Ok(())
            }, 
            None => {
                Err(format!("Phetools object not initialized"))
            }
        }
    }

    pub fn get_column(&self, col: usize) -> Result<Vec<String>, String> {
        match &self.phetools {
            Some(ptools) => {
                if col >= ptools.ncols() {
                    return Err(format!("request to get row {} from table with only {} rows", col, ptools.ncols()));
                }
                let column = ptools.get_string_column(col)?;
                Ok(column)
            },
            None => Err(format!("Could not get column because Phetools was null"))
        }
        
    }

    pub fn get_current_row(&self) -> Option<usize> {
        self.current_row
    }

    pub fn get_current_column(&self) -> Option<usize> {
        self.current_column
    }

    pub fn set_current_row(&mut self, row: usize) {
        match &self.phetools {
            Some(ptools) => {
                if row >= ptools.nrows() {
                    self.current_row = None
                } else {
                    self.current_row = Some(row)
                }
            },
            None => {
                println!("TODO do we need error handling")
            }
        }
        
    } 

    pub fn set_current_column(&mut self, col: usize) {
        match &self.phetools {
            Some(ptools) => {
                if col >= ptools.ncols() {
                    self.current_column = None
                } else {
                    self.current_column = Some(col)
                }
            },
            None => println!("Null phetools") // todo -- error needed here?
        }
        
    } 

    pub fn set_current_operation(&mut self, op: &str) -> Result<(), String> {
            match op {
                "show_column"=> {
                    self.current_operation = PptOperation::ShowColumn;
                },
                "show_row" => {
                    self.current_operation = PptOperation::ShowRow;
                }
                "table" => {
                    self.current_operation = PptOperation::EntireTable;
                }
                _ => {
                    self.current_operation = PptOperation::EntireTable;
                    return Err(format!("Did not recognize operation {}", op));
                }
            }
            Ok(())
    }

    pub fn set_value<T>(&mut self, r: usize, c: usize, value: T) 
        -> Result<(), String>
        where T: Into<String>
    {
        match &mut self.phetools {
            Some(ptools) =>  {
                ptools.set_value(r, c, value)?;
                Ok(())
            }, 
            None => {Err(format!("phetools not initialized"))}
        }
    }

    pub fn load_excel_template(&mut self, excel_file: &str) -> Result<(), String>{
        match self.phetools.as_mut() {
            Some(ptools) => {
                match ptools.load_excel_template(excel_file) {
                    Ok(_) => {return  Ok(());},
                    Err(evec) => {
                        let msg = evec.join("; ");
                        return Err(msg);
                    }
                }
            },
            None => {return Err(format!("Could not load excel file since Phetools was null"))}
        }
    }


    /* Initialize an existing phetools template, that must have at least one phenopacket row
    pub fn initialize_existing_template() -> Result<(), String> {
        match &self.pt_template_path {
            Some(tplt_file) => {
                match &self.ontology {
                    Some(hpo) => {
                        let result = PptEditTable::from_path(tplt_file, hpo);
                        match result {
                            Ok(table) => {  
                                Ok(table)
                            },
                            Err(e) => Err(format!("Could not init edit table: {}", e.to_string()))
                        }
                    },
                    None => Err(format!("HPO not initialized"))
                }
            },
            None => {
                Err(format!("phetools template path not initialized"))
            }
        }
    }
*/
    pub fn check_readiness(&self) -> bool {
        return self.ontology.is_some() && self.pt_template_path.is_some();
    }

    /// TODO figure out error handling
    pub fn map_text(&self, input_text: &str) -> String {
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = Arc::clone(hpo);
                let hpo_ref = hpo_arc.as_ref();
                let fenominal = Fenominal::from(hpo_ref);
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
    pub fn map_text_to_term_list(&mut self, input_text: &str) -> Vec<TermId> {
        match &self.ontology {
            Some(hpo) => {
                let hpo_arc = Arc::clone(hpo);
                let hpo_ref = hpo_arc.as_ref();
                let fenominal = Fenominal::from(hpo_ref);
                let hpo_arc = Arc::clone(hpo);
                let phetools = PheTools::new(hpo_arc);
                let fenom_hits: Vec<TermId> = fenominal.process(input_text);
                let ordered_hpo_ids = phetools.arrange_terms(&fenom_hits);
                return ordered_hpo_ids;
            },
            None => {
                return vec![];
            }
        }
/* 
        match &self.ontology {
            Some(hpo) => {
                let fenominal = Fenominal::from(hpo);
                let fenom_hits: Vec<TermId> = fenominal.process(input_text);
                match self.edit_table() {
                    Some(table) => {
                        let ordered_hpo_ids = table.phetools().arrange_terms(&fenom_hits);
                        return ordered_hpo_ids;
                    },
                    None => { vec![]}
                }
            },
            None => {
                vec![]
            }
        }*/
    }

    /// The GUI will allow the user to set the value of a specific cell.
    pub fn set_table_cell(&mut self, r: usize, c: usize, val: impl Into<String>) 
        -> Result<(), String>
    {
        match self.phetools.as_mut() {
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
            Some(_) => true,
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
    // TODO does this really need to be mut?
    let mut singleton = singleton.lock().unwrap();
    let fresult = singleton.map_text_to_term_list(input_text);
    print!("hpo_curator: We got {} term ids from seed", fresult.len());
    match &singleton.ontology {
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
                Ok(matrix) => {
                    let json_string = serde_json::to_string(&matrix).unwrap();
                    //singleton.set_edit_table(matrix);
                    println!("TODO UPDATE");
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

/// When we initialize a new Table (Excel file) for curation, we start with
/// a text that contains candidate HPO terms for curation.
/// This function performs text mining on that text and creates
/// a Matrix of Strings with which we initialize the table in the GUI
/// TODO: better documentation
#[tauri::command]
pub fn get_phetools_table(singleton: State<Mutex<HpoCuratorSingleton>>,
) -> Result<Vec<Vec<String>>, String> 
{
    let singleton = singleton.lock().unwrap();
    return singleton.get_matrix();
}
