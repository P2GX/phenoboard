

use ferriphene::fenominal::Fenominal;

use tauri::State;
use std::sync::Mutex;
use crate::hpo_curator::HpoCuratorSingleton;

#[tauri::command]
pub fn run_text_mining(singleton: State<Mutex<HpoCuratorSingleton>>, text:&str) -> String {
    let mut singleton = singleton.lock().unwrap();

    let hp_json_path_str =  singleton.hp_json_path();
    match  hp_json_path_str {
        Some(hp_json) => {
            let fenominal = Fenominal::new(hp_json);
            let json_string = fenominal.map_text_to_json(text);
            json_string
        },
        None => "No string".to_ascii_lowercase()
    }
   
}