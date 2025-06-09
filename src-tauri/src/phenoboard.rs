//! This module creates a singleton object that we use to coordinate analysis across the application
//!
//! Each table cell is modelled as having the ability to return a datatype and the contents as a String
//! We garantee that if these objects are created, then we are ready to create phenopackets.

use crate::{directory_manager::DirectoryManager, hpo::hpo_version_checker::{HpoVersionChecker, OntoliusHpoVersionChecker}, settings::HpoCuratorSettings};
use std::{collections::HashMap, path::Path, sync::Arc};

use ontolius::{io::OntologyLoaderBuilder, ontology::{csr::FullCsrOntology, MetadataAware, OntologyTerms}, TermId};
use rfenominal::{
    fenominal::{Fenominal, FenominalHit},
    TextMiner,
};
use rphetools::PheTools;
use std::sync::Mutex;


pub enum PptOperation {
    ShowColumn,
    ShowRow,
    EntireTable,
}

/// A singleton
pub struct HpoCuratorSingleton {
    settings: HpoCuratorSettings,
    ontology: Option<Arc<FullCsrOntology>>,
    pt_template_path: Option<String>,
    phetools: Option<PheTools>,
    current_row: Option<usize>,
    current_column: Option<usize>,
    current_operation: PptOperation,
    /// this value is true if there are changes we have not yet saved to file
    unsaved: bool,
}

impl HpoCuratorSingleton {
    pub fn new() -> Self {
        HpoCuratorSingleton {
            settings: HpoCuratorSettings::load_settings(), 
            ontology: None,
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
                let mut phetools = PheTools::new(hpo_arc);
                phetools.load_excel_template(template_path)?;
                self.phetools = Some(phetools);
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
                Ok(())
            }
            Err(e) => Err(e.clone()),
        }
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

    pub fn get_matrix(&self) -> Result<Vec<Vec<String>>, String> {
        println!("hpo_curator::get_matrix");
        match &self.phetools {
            Some(ptools) => {
                let matrix = ptools.get_string_matrix()?;
                Ok(matrix)
            }
            None => Err(format!("Table not initialized")),
        }
    }

    pub fn get_hpo_version(&self) -> Result<String, String> {
        match &self.ontology {
            Some(hpo) => Ok(hpo.version().to_string()),
            None => Err("HPO not initialized".to_string()),
        }
    }

    pub fn get_row(&self, row: usize) -> Result<Vec<String>, String> {
        match &self.phetools {
            Some(ptools) => {
                let row = ptools.get_string_row(row)?;
                Ok(row)
            }
            None => Err(format!("Could not get row because Phetools was null")),
        }
    }


    
    pub fn new_row(
        &mut self,
        pmid: impl Into<String>,
        title: impl Into<String>,
        individual_id: impl Into<String>,
    ) -> Result<(), String> {
        eprintln!("[ERROR] HpoCurator::new_row not implemented");
        /* 
        match &mut self.phetools {
            Some(ptools) => {
                ptools.add_row(pmid, title, individual_id)?;
                Ok(())
            }
            None => Err(format!("Phetools object not initialized")),
        }*/
        Ok(())
    }

    pub fn new_row_with_pt(
        &mut self,
        pmid: impl Into<String>,
        title: impl Into<String>,
        individual_id: impl Into<String>,
    ) -> Result<(), String> {
        match &mut self.phetools {
            Some(ptools) => {
               // ptools.add_row(pmid, title, individual_id)?;
                eprintln!("[ERROR] HpoCurator::add_row not implemented");
                Ok(())
            }
            None => Err(format!("Phetools object not initialized")),
        }
    }

    pub fn get_column(&mut self, col: usize) -> Result<Vec<String>, String> {
        match &self.phetools {
            Some(ptools) => {
                if col >= ptools.ncols() {
                    return Err(format!(
                        "request to get row {} from table with only {} rows",
                        col,
                        ptools.ncols()
                    ));
                }
                let column = ptools.get_string_column(col)?;
                self.set_current_column(col);
                Ok(column)
            }
            None => Err(format!("Could not get column because Phetools was null")),
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
            }
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
                    println!("Setting current column to {}", col);
                    self.current_column = Some(col)
                }
            }
            None => println!("Null phetools"), // todo -- error needed here?
        }
    }

    pub fn set_current_operation(&mut self, op: &str) -> Result<(), String> {
        match op {
            "show_column" => {
                self.current_operation = PptOperation::ShowColumn;
            }
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

    pub fn set_value(
        &mut self,
        r: usize,
        c: usize,
        value: &str,
    ) -> Result<(), String> {
        match &mut self.phetools {
            Some(ptools) => {
                println!("hpo_curator: set_value r={}. c={}, value=?", r,c);
                match ptools.set_value(r, c, value) {
                    Ok(_) => { println!("hpo_curaotr, set_value, OK"); },
                    Err(e ) => { eprintln!("{:?}", e)}
                }
                Ok(())
            }
            None => Err(format!("phetools not initialized")),
        }
    }

    pub fn load_excel_template(&mut self, excel_file: &str) -> Result<(), String> {
        match self.phetools.as_mut() {
            Some(ptools) => match ptools.load_excel_template(excel_file) {
                Ok(_) => {
                    return Ok(());
                }
                Err(msg) => {
                    return Err(msg);
                }
            },
            None => return Err(format!("Could not load excel file since Phetools was null")),
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

    pub fn get_hpo_data(&self) -> Result<HashMap<String,String>, String> {
        match &self.phetools {
            Some(ptools) => {
                let dat= ptools.get_hpo_data();
                return Ok(dat);
            },
            None => Err(format!("Phetools template not initialized"))
        }
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


    /// This method can be used to retrieve a matrix of string with the first three
    /// phetools columns (pmid, title, individual id) together with a specific HPO column
    pub fn get_column_with_context(&mut self, col: usize) -> Result<Vec<Vec<String>>, String> {
        match &mut self.phetools {
            Some(ptools) => {
                if ptools.is_hpo_col(col) {
                    let mat = ptools.get_hpo_col_with_context(col)?;
                    self.set_current_column(col);
                    return Ok(mat);
                } else {
                    let ctype = ptools.col_type_at(col)?;
                    return Err(format!("Column type {ctype} not supported."));
                }
                //ptools.get_column_with_context(col).map_error(|e| e.to_string())?;
            }
            None => {
                return Err(format!("Phetools not intialized"));
            }
        };
    }

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
            }
            None => {
                return vec![];
            }
        }
    }

    /// The GUI will allow the user to set the value of a specific cell.
    pub fn set_table_cell(
        &mut self,
        r: usize,
        c: usize,
        val: &str,
    ) -> Result<(), String> {
        match self.phetools.as_mut() {
            Some(table) => {
                table.set_value(r, c, val)?;
                Ok(())
            }
            None => Err(format!("Attempt to set uninitialized table")),
        }
    }

    pub fn hpo_initialized(&self) -> bool {
        match &self.ontology {
            Some(_) => true,
            None => false,
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
    ) -> Result<String, String> {
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
                    Ok(matrix) => {
                        let json_string = serde_json::to_string(&matrix).unwrap();
                        return Ok(json_string);
                    }
                    Err(e) => {
                        return Err(format!("Could not create matrix: {}", e));
                    }
                }
            }
            None => { return Err(format!("Could not retrieve ontology")); }
            }
    }


}
