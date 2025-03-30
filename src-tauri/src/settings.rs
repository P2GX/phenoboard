//! Module to persist settings including the location of the hp.json file
//!

use dirs::home_dir;
use ontolius::io::OntologyLoaderBuilder;
use ontolius::ontology::csr::FullCsrOntology;
use rfd::FileDialog;
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

use crate::hpo_curator::HpoCuratorSingleton;

/// Settings to persist between sessions.

pub struct HpoCuratorSettings {
    hp_json_file: String,
}

impl HpoCuratorSettings {
    pub fn new<T: Into<String>>(hpo_json_path: T) -> Self {
        HpoCuratorSettings {
            hp_json_file: hpo_json_path.into(),
        }
    }

    pub fn save_settings(&self) -> Option<String> {
        let _config_file = get_config_file(); // TODO
        ensure_config_directory();
        let config_file = get_config_file();
        let mut file = fs::File::create(config_file).expect("Failed to create config file");
        let settings_data = format!("hp_json_path: {}\n", self.hp_json_file);
        let result = file.write_all(settings_data.as_bytes());
        if result.is_err() {
            print!("Could not save settings file"); // TODO
        }
        Some("saved".to_string())
    }

    pub fn from_settings() -> Result<Self, String> {
        let config_file = get_config_file();
        let mut file = fs::File::open(config_file).map_err(|e| e.to_string())?;
        let mut file_contents = String::new();
        file.read_to_string(&mut file_contents)
            .map_err(|e| e.to_string())?;
        if let Some(line) = file_contents
            .lines()
            .find(|line| line.starts_with("hp_json_path:"))
        {
            let hp_json_path = line.trim_start_matches("hp_json_path: ").trim();
            Ok(HpoCuratorSettings::new(hp_json_path))
        } else {
            Err(format!("hp_json_path not found at {:?}", get_config_file()))
        }
    }
}

impl Default for HpoCuratorSettings {
    fn default() -> Self {
        HpoCuratorSettings {
            hp_json_file: String::default(),
        }
    }
}

fn get_config_path() -> PathBuf {
    let mut config_dir = home_dir().expect("Could not determine home directory");
    config_dir.push(".hpocurator"); // ~/.hpocurator
    config_dir
}

fn get_config_file() -> PathBuf {
    let mut config_file = get_config_path();
    config_file.push("hpocurator.config"); // ~/.hpocurator/hpocurator.config
    config_file
}

fn ensure_config_directory() {
    let config_dir = get_config_path();
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).expect("Failed to create config directory");
    }
}

pub fn load_config() -> Option<String> {
    let config_file = get_config_file();
    if config_file.exists() {
        fs::read_to_string(config_file).ok()
    } else {
        None
    }
}

#[tauri::command]
pub fn load_hpo_from_hp_json(
    singleton: State<Mutex<HpoCuratorSingleton>>,
) -> Result<(), String> {
    let mut singleton = singleton.lock().unwrap();
    let hpo_json = singleton.hp_json_path();
    match hpo_json {
        Err(e) => {
            return Err("Could not find hp.json file".to_string());
        }
        Ok(hp_json) => {
            let loader = OntologyLoaderBuilder::new().obographs_parser().build();
            let hpo: FullCsrOntology = loader.load_from_path(hp_json).expect("Ontolius: Could not load hp.json");
            singleton.set_hpo(hpo);
            return Ok(());
        }
    }
}

#[tauri::command]
pub fn select_hp_json_download_path(
    singleton: State<Mutex<HpoCuratorSingleton>>,
) -> Option<String> {
    let mut singleton = singleton.lock().unwrap();
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
                    save_hp_json_path(&hpj_path);
                    singleton.set_hp_hson(&hpj_path);
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
pub fn save_hp_json_path(hp_json_path: &str) {
    let hp_settings = HpoCuratorSettings::new(hp_json_path);
    hp_settings.save_settings();
}

#[tauri::command]
pub fn get_hpo_version(
    singleton: State<Mutex<HpoCuratorSingleton>>,
) -> Result<String, String> {
    let singleton = singleton.lock().unwrap();
    singleton.get_hpo_version()
}

#[tauri::command]
pub fn get_hp_json_path(
    singleton: State<Mutex<HpoCuratorSingleton>>,
) -> Result<String, String> {
    let singleton = singleton.lock().unwrap();
    singleton.hp_json_path()
}


#[tauri::command]
pub fn get_pt_template_path(
    singleton: State<Mutex<HpoCuratorSingleton>>,
) -> Result<String, String> {
    let singleton = singleton.lock().unwrap();
    singleton.pt_template_path()
}



/// TODO 
#[tauri::command]
pub fn pt_template_initialized(
    singleton: State<Mutex<HpoCuratorSingleton>>,
) -> bool {
    let singleton = singleton.lock().unwrap();
    false
}


#[tauri::command]
pub fn hpo_initialized(
    singleton: State<Mutex<HpoCuratorSingleton>>,
) -> bool {
    let singleton = singleton.lock().unwrap();
    singleton.hpo_initialized()
}


#[tauri::command]
pub fn select_phetools_template_path(
    singleton: State<Mutex<HpoCuratorSingleton>>,
) -> Result<String, String> {
    let mut singleton = singleton.lock().unwrap();
    // synchronous (blocking) file chooser
    let result = FileDialog::new()
        .add_filter("Phetools template file", &["xlsx"])
       // .set_directory("/")
        .pick_file();
    println!("select_phetools_template_path - files {:?}", result);
    match result {
        Some(file) => {
            let pbresult = file.canonicalize();
            match pbresult {
                Ok(abspath) => {
                    let pt_path = abspath.canonicalize().unwrap().display().to_string();
                    singleton.set_pt_template_path(&pt_path);
                    return Ok(pt_path);
                }
                Err(e) => {
                    Err(format!("Could not get path: {:?}", e))
                }
            }
        }
        None => {
            Err(format!("Could not get path from file dialog"))
        }
    }
}



