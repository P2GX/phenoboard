//! Ontology loader
//! 
//! Convenience class to load the HPO Ontology

use ontolius::{io::OntologyLoaderBuilder, ontology::csr::FullCsrOntology};



pub fn load_ontology(file_path: &str) -> Result<FullCsrOntology, String> {
    if ! file_path.ends_with("hp.json") {
         return Err(format!("Invalid HPO filename '{}'", file_path));
    }
    let loader = OntologyLoaderBuilder::new().obographs_parser().build();
    let ontology: FullCsrOntology = loader
                    .load_from_path(file_path)
                    .expect("Could not load {file_path}");
    return Ok(ontology);
}


