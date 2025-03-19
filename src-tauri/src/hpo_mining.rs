use crate::hpo_curator::HpoCuratorSingleton;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn run_text_mining(singleton: State<Mutex<HpoCuratorSingleton>>, input_text: &str) -> String {
    let singleton = singleton.lock().unwrap();
    let json = singleton.map_text(input_text);
    json
}
