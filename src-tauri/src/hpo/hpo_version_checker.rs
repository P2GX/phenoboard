//! Module to persist settings including the location of the hp.json file
//!
use std::fs;
use std::path::{Path, PathBuf};
use ontolius::ontology::csr::FullCsrOntology;
use ontolius::ontology::MetadataAware;


const REMOTE_HP_JSON_URL: &str = "https://purl.obolibrary.org/obo/hp/hp.json";


/// Trait for checking whether the HPO version we are currently using could
/// be updated online or whether we already have the latest version
pub trait HpoVersionChecker {
    fn hp_json_can_be_updated(&self) -> bool;
    fn remote_hpo_version(&self) -> &str; 
    fn current_hpo_version(&self) -> &str;
}

/// An implementation to use with a local hp.json file to check whether it has the latest version
#[derive(Debug)]
struct LocalFileHpoVersionChecker {
    hp_json_path: PathBuf,
    local_hpo_version: String,
    remote_hpo_version: String
}

/// An implementation to use on Ontolius HPO object to check whether it has the latest version
#[derive(Debug)]
pub struct OntoliusHpoVersionChecker {
    ontolius_hpo_version: String,
    remote_hpo_version: String
}


/// Extract the ontology version from the JSON representation of hp.json
fn get_version_from_json(json: &serde_json::Value) -> Result<String, String> {
    let version_info = json["graphs"][0]["meta"]["basicPropertyValues"]
        .as_array()
        .and_then(|props| {
            props.iter().find_map(|item| {
                if item.get("pred")?.as_str()? == "http://www.w3.org/2002/07/owl#versionInfo" {
                    item.get("val")?.as_str()
                } else {
                    None
                }
            })
        });

    match version_info {
        Some(version) => Ok(version.to_string()),
        None => Err("versionInfo not found".to_string()),
    }
}

/// Get the version of the latest hp.json online
fn get_remote_version() -> Result<String, String> {
    let response = reqwest::blocking::get(REMOTE_HP_JSON_URL)
        .map_err(|e| format!("Request failed: {}", e))?;
    let json: serde_json::Value = response
        .json()
        .map_err(|e| format!("JSON parse failed: {}", e))?;

    get_version_from_json(&json)
}


impl LocalFileHpoVersionChecker {
    /// Try to get the local and the remote versions
    /// return an Error if either of the versions cannot be obtained
    /// The error will tell the user if the local hp.json file cannot be found or if the http request failed
    /// The object can be used to get the versions and to tell if we can update our version
    pub fn new(hp_json: impl Into<String>) -> Result<Self, String> {
        let binding = hp_json.into();
        let path = Path::new(&binding);
        if !path.exists() {
            return Err(format!("Could not find hp.json at {}", &binding));
        } 
        let local_version = Self::get_local_version(path)?;
        let remote_version = get_remote_version()?;
        Ok(Self { 
            hp_json_path:path.into(), 
            local_hpo_version: local_version, 
            remote_hpo_version: remote_version
        })
    }

    /// Get the version of the local hp.json
    fn get_local_version(local_path: &Path) -> Result<String, String> {
        let data = fs::read_to_string(local_path).map_err(|e| e.to_string())?;
        let json: serde_json::Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;
        get_version_from_json(&json)
    }

    pub fn local_hpo_version(&self) -> &str {
        &self.local_hpo_version
    }
}

impl HpoVersionChecker for LocalFileHpoVersionChecker {
    fn hp_json_can_be_updated(&self) -> bool {
        return self.local_hpo_version != self.remote_hpo_version;
    }
    fn remote_hpo_version(&self) -> &str {
        &self.remote_hpo_version
    }
    
    fn current_hpo_version(&self) -> &str {
        &self.local_hpo_version()
    } 
}



impl OntoliusHpoVersionChecker {
    pub fn new(hpo: &FullCsrOntology) -> Result<Self, String> {
        let hpo_version = hpo.version();
        let remote_version = get_remote_version()?;
        Ok(Self { 
            ontolius_hpo_version: hpo_version.to_string(), 
            remote_hpo_version: remote_version
        })
    }

    pub fn ontolius_hpo_version(&self) -> &str {
        &self.ontolius_hpo_version
    }
}

impl HpoVersionChecker for OntoliusHpoVersionChecker {
    fn hp_json_can_be_updated(&self) -> bool {
        return self.ontolius_hpo_version() != self.remote_hpo_version();
    }
    
    fn remote_hpo_version(&self) -> &str {
        &self.remote_hpo_version
    }
    
    fn current_hpo_version(&self) -> &str {
        &self.ontolius_hpo_version
    }
}

