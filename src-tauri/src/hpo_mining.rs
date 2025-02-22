
use std::collections::HashMap;

use ferriphene::{self, fenominal_traits::TermIdToTextMapper, hpo::{clinical_mapper::ClinicalMapper, simple_hpo_parser::SimpleHpoParser}};
use ontolius::prelude::TermId;

#[tauri::command]
pub fn run_text_mining(text:&str) -> String {
    let hp_json_path_str: &str = "/Users/robin/data/hpo/hp.json";
    let simple_mapper = SimpleHpoParser::new(hp_json_path_str).unwrap();
    let t2tmap: HashMap<String, TermId> = simple_mapper.get_text_to_term_map();
    let mut clinical_mapper = ClinicalMapper::from_map(&t2tmap);
    let matching = clinical_mapper.map_text(text);
    for m in matching {
        println!("{}", m);
    }
    let json_string = clinical_mapper.map_text_to_json(&text);
    json_string
}