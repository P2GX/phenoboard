use std::fs;
use std::path::PathBuf;
use std::io::Write;
use dirs::home_dir;
use tauri_plugin_dialog::{FileDialogBuilder, FilePath};


/// Settings to persist between sessions.
pub struct HpoCuratorSettings {
    hp_json_file: String,

}


impl HpoCuratorSettings {
    pub fn new<T: Into<String>>(hpo_json_path: T) -> Self {
        HpoCuratorSettings {
            hp_json_file: hpo_json_path.into()
        }
    }
}


pub fn get_config_path() -> PathBuf {
    let mut config_dir = home_dir().expect("Could not determine home directory");
    config_dir.push(".hpocurator"); // ~/.hpocurator
    config_dir
}

pub fn get_config_file() -> PathBuf {
    let mut config_file = get_config_path();
    config_file.push("hpocurator.config"); // ~/.hpocurator/hpocurator.config
    config_file
}

pub fn ensure_config_directory() {
    let config_dir = get_config_path();
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).expect("Failed to create config directory");
    }
}

pub fn save_config(data: &str) {
    ensure_config_directory();
    let config_file = get_config_file();
    let mut file = fs::File::create(config_file).expect("Failed to create config file");
    file.write_all(data.as_bytes()).expect("Failed to write config file");
}

pub fn load_config() -> Option<String> {
    let config_file = get_config_file();
    if config_file.exists() {
        fs::read_to_string(config_file).ok()
    } else {
        None
    }
}



use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn select_download_directory(app: tauri::AppHandle)-> Option<String> {
    println!("BLABLA");
    let file_path = app.dialog()
        .file()
        .add_filter("My Filter", &["png", "jpeg"])
        .pick_file(|file|{println!("got file {:?}", file) ; }); // blocking call to pick a file

   
    Some("None".to_string())
        
}

