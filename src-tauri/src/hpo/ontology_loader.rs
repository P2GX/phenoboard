use std::path::Path;

use ontolius::{io::OntologyLoaderBuilder, ontology::csr::FullCsrOntology};
use tauri_plugin_fs::FilePath;



pub fn load_ontology(file_path: FilePath) -> Result<FullCsrOntology, String> {
    if let Some(path) = file_path.as_path() {
        if let Some(file_name) = path.file_name() {
            if let Some(file_name_str) = file_name.to_str() {
                if file_name != "hp.json" {
                    return Err(format!("Invalid HPO filename '{}'", file_name_str));
                }
            }
        } else {
             return Err("No file name found for  HPO".to_string());
        }
    }
               
    match file_path.as_path() {
        Some(fpath) => {
            let loader = OntologyLoaderBuilder::new().obographs_parser().build();
            let ontology: FullCsrOntology = loader
                            .load_from_path(fpath)
                            .expect("Could not load {file_path}");
            return Ok(ontology);
        },
        None => {
            return Err(format!("{file_path} is invalid"));
        },
    }
}


