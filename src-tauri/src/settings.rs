use std::fs;
use std::path::PathBuf;
use std::io::{Read, Write};
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

    pub fn save_settings(&self) -> Option<String> {
        let config_file = get_config_file();
        ensure_config_directory();
        let config_file = get_config_file();
        let mut file = fs::File::create(config_file).expect("Failed to create config file");
        let settings_data = format!("hp_json_path: {}\n", self.hp_json_file);
        file.write_all(settings_data.as_bytes());
        Some("saved".to_string())
    }


    pub fn from_settings() -> Result<Self, String> {
        let config_file = get_config_file();
        let mut file = fs::File::open(config_file).map_err(|e| e.to_string())?;
        let mut file_contents = String::new();
        file.read_to_string(&mut file_contents).map_err(|e| e.to_string())?;
        if let Some(line) = file_contents.lines().find(|line| line.starts_with("hp_json_path:")) {
            let hp_json_path = line.trim_start_matches("hp_json_path: ").trim();
            Ok(HpoCuratorSettings::new(hp_json_path))
        } else {
            Err(format!("hp_json_path not found at {:?}", get_config_file()))
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



use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn select_hp_json_download_path(app: tauri::AppHandle)-> Option<String> {
    println!("BLABLA");
    let file_path = app.dialog()
        .file()
        .add_filter("HPO JSON file", &["json"])
        .pick_file(|file|{
            match file {
                Some(hp_file) => {
                    println!("got hp file {}", hp_file); 
                    Some(hp_file.to_string())
                },
                _ => {println!("Could not retrieve hp.json file NO"); 
                    None
            } 
            };            
        }); // blocking call to pick a file

   
    Some("None".to_string())   
}

#[tauri::command]
pub async fn save_hp_json_path(hp_json_path: &str)-> Result<String,String> {
   let hp_settings = HpoCuratorSettings::new(hp_json_path);
   hp_settings.save_settings();
   Ok("None".to_ascii_lowercase())
}

