mod directory_manager;
mod phenoboard;
mod hpo;
mod settings;
mod table_manager;

use ontolius::{io::OntologyLoaderBuilder, ontology::{csr::FullCsrOntology, MetadataAware}};
use phenoboard::HpoCuratorSingleton;
use rfd::FileDialog;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_dialog::DialogExt;
use std::{collections::HashMap, sync::{Arc, Mutex}};
use tauri_plugin_fs::init;

use crate::hpo::ontology_loader;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .manage(Arc::new(Mutex::new(HpoCuratorSingleton::new())))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(init())
        .invoke_handler(tauri::generate_handler![
            check_if_phetools_is_ready,
            get_ppkt_store_json,
            get_phetools_table,
            get_template_summary,
            hpo_can_be_updated,
            load_hpo,
            run_text_mining,
            set_value,
            update_descriptive_stats,
            table_manager::edit_current_column,
            table_manager::get_phetools_column,
            table_manager::get_selected_phetools_column,
            table_manager::process_pyphetools_table_rclick,
            get_table_columns_from_seeds,
            get_hpo_data,
            get_hp_json_path,
            get_pt_template_path,
            select_hp_json_download_path,
            select_phetools_template_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}




/// Load the HPO from hp.json
#[tauri::command]
fn load_hpo(
    app: AppHandle,
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>,
) -> Result<(), String> {
    let phenoboard_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    std::thread::spawn(move || {
        match app.dialog().file().blocking_pick_file() {
            Some(file) => {
                let _ = app.emit("loadedHPO", "loading");
                match ontology_loader::load_ontology(file) {
                    Ok(ontology) => {
                        let hpo_arc = Arc::new(ontology);
                        let mut guard = phenoboard_arc.lock().unwrap(); 
                        let hpo_v = hpo_arc.version().to_string();
                        guard.set_hpo(hpo_arc);
                        let _ = app.emit("loadedHPO", hpo_v);
                    },
                    Err(_) => {
                        let _ = app.emit("loadedHPO", "failure");
                    }
                }
            },
            None => {
                let _ = app.emit("loadedHPO", "failure");
            }
        }
    });
    Ok(())
}


#[tauri::command]
fn run_text_mining(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>,
    input_text: &str
) -> String {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    let json = singleton.map_text(input_text);
    json
}


/// When we initialize a new Table (Excel file) for curation, we start with
/// a text that contains candidate HPO terms for curation.
/// This function performs text mining on that text and creates
/// a Matrix of Strings with which we initialize the table in the GUI
/// TODO: better documentation
#[tauri::command]
fn get_phetools_table(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>,
) -> Result<Vec<Vec<String>>, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    return singleton.get_matrix();
}

#[tauri::command]
fn set_value(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>,
    r: usize,
    c: usize,
    value: &str,
) -> Result<(), String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.set_value(r, c, value)?;
    Ok(())
}


#[tauri::command]
fn get_template_summary(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) -> Result<HashMap<String,String>, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.get_template_summary()
}

#[tauri::command]
fn get_hpo_data(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) ->Result<HashMap<String,String>, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.get_hpo_data()
}

/// Check whether the HPO version we are using is the latest version
/// by comparing the latest version online
#[tauri::command]
fn hpo_can_be_updated(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) ->Result<bool, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.hpo_can_be_updated()
}

/// Get a JSON object that represents the directory and file structure of the Phenopacket Store
#[tauri::command]
fn get_ppkt_store_json(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) ->  Result<serde_json::Value, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.get_ppkt_store_json()
}


#[tauri::command]
fn check_if_phetools_is_ready(
    app: AppHandle,
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) -> bool {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    let tool_ready = singleton.check_readiness();
    if tool_ready {
        let _ = app.emit("ready", true);
    } else {
        let _ = app.emit("ready", false);
    }
    tool_ready
}

#[tauri::command]
async fn update_descriptive_stats(
    app: AppHandle,
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) -> Result<(), String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    let hpo_map = singleton.get_hpo_data()?;
    let hpo_version = match hpo_map.get("hpo_version"){
        Some(hpo_version) => hpo_version,
        None =>  { return Err(format!("Could not get HPO data map")); }
    };
    let n_hpo_terms = match hpo_map.get("n_hpo_terms") {
        Some(hpo_version) => hpo_version,
        None => { return Err(format!("Could not get HPO data map")); }
    };
    let _ = app.emit("n_hpo_terms", format!("{}", n_hpo_terms));
    let _ = app.emit("hpo_version", format!("{}", hpo_version));
    Ok(())
}

#[tauri::command]
fn load_hpo_from_hp_json(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) -> Result<(), String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    let hpo_json = singleton.hp_json_path();
    match hpo_json {
        Err(e) => {
            return Err(format!("Could not find hp.json file: {}", e));
        }
        Ok(hp_json) => {
            let loader = OntologyLoaderBuilder::new().obographs_parser().build();
            let hpo: FullCsrOntology = loader
                .load_from_path(&hp_json)
                .expect("Ontolius: Could not load hp.json");
            let hpo_arc = Arc::new(hpo);
            singleton.set_hpo(hpo_arc);
            let _ = singleton.set_hp_json(&hp_json);
            return Ok(());
        }
    }
}

#[tauri::command]
fn select_hp_json_download_path(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) -> Option<String> {
     let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    // synchronous (blocking) file chooser
    let result = FileDialog::new()
        .add_filter("HPO JSON", &["json"])
        .set_directory("/")
        .pick_file();
    println!("files {:?}", result);
    match result {
        Some(file) => {
            let pbresult = file.canonicalize();
            match pbresult {
                Ok(abspath) => {
                    let hpj_path = abspath.canonicalize().unwrap().display().to_string();
                    let _ = singleton.set_hp_json(&hpj_path);
                    return Some(hpj_path);
                }
                Err(e) => {
                    println!("Could not get path: {:?}", e)
                }
            }
        }
        None => {}
    }
    Some("None".to_string())
}

#[tauri::command]
fn get_hpo_version(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) -> Result<String, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.get_hpo_version()
}

#[tauri::command]
fn get_hp_json_path(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) -> Result<String, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.hp_json_path()
}

#[tauri::command]
fn get_pt_template_path(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) -> Result<String, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.pt_template_path()
}




#[tauri::command]
fn select_phetools_template_path(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>
) -> Result<String, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    // synchronous (blocking) file chooser
    let result = FileDialog::new()
        .add_filter("Phetools template file", &["xlsx"])
        // .set_directory("/")
        .pick_file();
    match result {
        Some(file) => {
            let pbresult = file.canonicalize();
            match pbresult {
                Ok(abspath) => {
                    let pt_path = abspath.canonicalize().unwrap().display().to_string();
                    singleton.set_pt_template_path(&pt_path)?;
                    return Ok(pt_path);
                }
                Err(e) => Err(format!("Could not get path: {:?}", e)),
            }
        }
        None => Err(format!("Could not get path from file dialog")),
    }
}


/// When we initialize a new Table (Excel file) for curation, we start with
/// a text that contains candidate HPO terms for curation.
/// This function performs text mining on that text and creates
/// a Matrix of Strings with which we initialize the table in the GUI
/// TODO: better documentation

#[tauri::command]
fn get_table_columns_from_seeds(
    singleton: State<'_, Arc<Mutex<HpoCuratorSingleton>>>,
    disease_id: &str,
    disease_name: &str,
    hgnc_id: &str,
    gene_symbol: &str,
    transcript_id: &str,
    input_text: &str,
) -> Result<String, String> {
    let singleton_arc: Arc<Mutex<HpoCuratorSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.get_table_columns_from_seeds(
        disease_id, disease_name, hgnc_id, gene_symbol, transcript_id, input_text)
}

