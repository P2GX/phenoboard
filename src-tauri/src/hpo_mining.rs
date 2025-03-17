

use tauri::State;
use std::sync::Mutex;
use crate::hpo_curator::HpoCuratorSingleton;

#[tauri::command]
pub fn run_text_mining(singleton: State<Mutex<HpoCuratorSingleton>>, input_text:&str) -> String {
    let singleton = singleton.lock().unwrap();
    println!("IN RUN TEXT MINING");
    println!("input text {}", input_text);

    let json  = singleton.map_text(input_text);
    println!("JSON {}", &json);
    json
}