use ontolius::{io::OntologyLoaderBuilder, ontology::csr::FullCsrOntology};
use tauri_plugin_fs::FilePath;



pub fn load_ontology(file_path: FilePath) -> Result<FullCsrOntology, String> {
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
