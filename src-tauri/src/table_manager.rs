use std::sync::Mutex;

use tauri::State;

use crate::hpo_curator::HpoCuratorSingleton;




#[tauri::command]
pub fn process_pyphetools_table_rclick(
    singleton: State<Mutex<HpoCuratorSingleton>>,
    parameter: String
) -> String {
    println!("Received parameter: {}", parameter);
    format!("Processed: {}", parameter)
}