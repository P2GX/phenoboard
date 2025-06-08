mod directory_manager;
mod hpo_curator;
mod hpo_mining;
mod hpo_version_checker;
mod settings;
mod table_manager;

use hpo_curator::HpoCuratorSingleton;
use std::sync::Mutex;
use tauri_plugin_fs::init;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .manage(Mutex::new(HpoCuratorSingleton::new()))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(init())
        .invoke_handler(tauri::generate_handler![
            hpo_curator::get_phetools_table,
            hpo_curator::get_table_columns_from_seeds,
            hpo_curator::get_template_summary,
            hpo_curator::get_hpo_data,
            hpo_curator::get_ppkt_store_json,
            hpo_curator::update_descriptive_stats,
            hpo_mining::run_text_mining,
            settings::check_if_phetools_is_ready,
            settings::get_hp_json_path,
            settings::get_hpo_version,
            settings::get_pt_template_path,
            settings::hpo_initialized,
            settings::load_hpo_from_hp_json,
            settings::select_hp_json_download_path,
            settings::select_phetools_template_path,
            table_manager::edit_current_column,
            table_manager::get_phetools_column,
            table_manager::get_selected_phetools_column,
            table_manager::process_pyphetools_table_rclick,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
