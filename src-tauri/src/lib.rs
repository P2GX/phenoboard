mod hpo_curator;
mod hpo_mining;
mod settings;
mod table_manager;

use hpo_curator::HpoCuratorSingleton;
use std::sync::Mutex;
use tauri_plugin_fs::init;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .manage(Mutex::new(HpoCuratorSingleton::new()))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(init())
        .invoke_handler(tauri::generate_handler![
            greet,
            hpo_mining::run_text_mining,
            hpo_curator::initialize_hpo_and_get_version,
            hpo_curator::get_table_columns_from_seeds,
            settings::select_hp_json_download_path,
            settings::load_hpo_and_get_version,
            settings::save_hp_json_path,
            table_manager::process_pyphetools_table_rclick
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
