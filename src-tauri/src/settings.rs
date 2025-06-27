//! Module to persist settings including the location of the hp.json file
//!

use dirs::home_dir;
use ontolius::io::OntologyLoaderBuilder;
use ontolius::ontology::csr::FullCsrOntology;
use rfd::FileDialog;
use serde::{Serialize, Deserialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

use crate::phenoboard::PhenoboardSingleton;

/// Settings to persist between sessions.

#[derive(Debug, Serialize, Deserialize)]
pub struct HpoCuratorSettings {
    hp_json_file: Option<String>,
    user_name: Option<String>,
    orcid_id: Option<String>
}

impl HpoCuratorSettings {
    
    fn empty() -> Self {
        Self {
            hp_json_file: None,
            user_name: None,
            orcid_id: None,
        }
    }

    fn settings_directory_path() -> Result<PathBuf, String> {
        let path = home_dir();
        match path {
            Some (dir_path) => Ok(dir_path),
            None => Err(format!("Could not find home directory path"))
        }
    }


    pub fn set_hp_json_path(&mut self, hp_json: &str) -> Result<(), String> {
        let path = Path::new(hp_json);
        if ! path.is_file() {
            return Err(format!("Did not find file at {hp_json}"));
        }
        self.hp_json_file = Some(hp_json.to_string());
        println!("set_hp_json_path to {}", hp_json);
        self.save_settings()?;
        Ok(())
    }

    pub fn get_hp_json_path(&self) -> Result<String, String> {
        match &self.hp_json_file {
            Some (hp_json) => Ok(hp_json.clone()),
            None => Err(format!("hp.json file not initialized"))
        }
    }

    pub fn hp_json_path_or_none(&self) -> Option<String> {
        match &self.hp_json_file {
            Some (hp_json) => Some(hp_json.clone()),
            None => None
        }
    }


    /// Returns the path of the HPO Curator directory/settings file
    fn settings_file_path() -> Result<PathBuf, String> {
        let path = get_config_file()?;
        Ok(path)
    }

    pub fn load_settings() -> HpoCuratorSettings {
        let _ = ensure_config_directory();
        let path = get_config_file();
        if path.is_err() {
            return HpoCuratorSettings::empty();
        }
        let path = path.unwrap();
    
        if !path.exists() {
            // Write default settings if file doesn't exist
            let default_settings = HpoCuratorSettings::empty();
            let toml_string = toml::to_string_pretty(&default_settings)
                .expect("Could not serialize default settings");
            fs::write(&path, toml_string).expect("Could not write settings file");
            return default_settings;
        }
    
        // Read and parse existing settings
        let mut contents = String::new();
        File::open(&path)
            .expect("Could not open settings file")
            .read_to_string(&mut contents)
            .expect("Could not read settings file");
    
        toml::from_str(&contents).expect("Could not parse settings TOML")
    }

    pub fn save_settings(&self) -> Result<(), String> {
        let config_file = get_config_file()?;
        println!("{:?}", config_file);
        let toml_string = toml::to_string_pretty(&self)
            .map_err(|e| format!("Could not serialize settings: {}", e))?;
        println!("Sainv settings toml = {:?}", toml_string);
        let mut file = File::create(config_file)
            .map_err(|e| format!("Could not create settings file: {}", e))?;

        file.write_all(toml_string.as_bytes())
            .map_err(|e| format!("Could not write to settings file: {}", e))?;
        Ok(())

    }


}



fn get_config_path() -> Result<PathBuf, String> {
    match home_dir() {
        Some(mut home) => {
            home.push(".phenoboard");
            Ok(home)
        }
        None => Err(format!("Could not determine home directory"))
    }
}

fn get_config_file() -> Result<PathBuf, String> {
    let mut config_file = get_config_path()?;
    config_file.push("settings.toml"); // ~/.phenoboard/settings.toml
    Ok(config_file)
}

fn ensure_config_directory() -> Result<(), String> {
    let config_dir = get_config_path()?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).expect("Failed to create config directory");
    }
    Ok(())
}


