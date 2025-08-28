//! Module to manage the various directories with phenopacket templates
//! 
//! This module is meant to manage the directory structure of the 
//! phenopacket store, in which we have one directory for each cohort, and
//! each directory has the following structure
//! - phenopackets (directory with the generated phenopackets)
//! - input (directory with Excel or TSV files with the curation data)
//! - currently, Jupyter notebooks to create phenopackets from the input (this will be replaced once this software is mature)
//!

use std::{fmt, fs, path::{Path, PathBuf}};


/// Representation of one of the directories in Phenopacket Store (e.g., FBN1)
/// and of the contents of this directory
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CohortDirectory {
    cohort_name: String,
    cohort_directory_path: PathBuf,
    input_files: Vec<String>,
    phenopacket_files: Vec<String>,
}

impl CohortDirectory {

    pub fn new(cohort_name: String, base_dir: &PathBuf) -> Result<Self, String> {
        let cohort_dir = base_dir.join(&cohort_name);
        if ! cohort_dir.exists() {
            return Err(format!("Could not find cohort directory for '{}'", &cohort_name));
        }
        let input_files = Self::get_input_files(&cohort_dir)?;
        let ppkt_files = Self::get_phenopacket_files(&cohort_dir)?;
        Ok(Self { 
            cohort_name: cohort_name, 
            cohort_directory_path: cohort_dir,
            input_files: input_files,
            phenopacket_files: ppkt_files
        })
    }

    pub fn get_input_files(base_dir: &PathBuf) -> Result<Vec<String>, String> {
        let input_file_dir = base_dir.join("input");
        let input_files = Self::get_non_hidden_files_in_directory(&input_file_dir)?;
        return Ok(input_files);
    }

    pub fn get_phenopacket_files(base_dir: &PathBuf) -> Result<Vec<String>, String> {
        let ppkt_file_dir = base_dir.join("phenopackets");
        let ppkt_files = Self::get_non_hidden_files_in_directory(&ppkt_file_dir)?;
        Ok(ppkt_files)
    }


    /// Get all file paths in the indicated directory, skipping hidden files
    fn get_non_hidden_files_in_directory(dirpath: &Path) -> Result<Vec<String>, String> {
        if ! dirpath.exists() {
            return Err(format!("Could not find directory '{}'", &dirpath.to_string_lossy()));
        } 
        let mut file_list: Vec<String> = Vec::new();
        for entry in fs::read_dir(dirpath).map_err(|e|e.to_string())? {
            let entry = entry.map_err(|e|e.to_string())?;
            let metadata = entry.metadata().map_err(|e|e.to_string())?;
            let file_name = entry.file_name();
            let file_name_str = file_name.to_string_lossy();
            if file_name_str.starts_with('.') {
                continue;
            }
            if metadata.is_file() {
                file_list.push(file_name_str.to_string());
            }
        }
        Ok(file_list)
    }
}


impl fmt::Display for CohortDirectory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Cohort: {}, Path: {}",
            self.cohort_name,
            self.cohort_directory_path.display()
        )
    }
}

#[derive(Debug, serde::Serialize)]
pub struct DirectoryManager {
    /// Base directory where all cohort subdirectories are contained
    /// In phenopacket-store, this would be `phenopacket-store/notebooks``
    base_dir: PathBuf,
    cohort_directories: Vec<CohortDirectory>
}






impl DirectoryManager {
    pub fn new(ppkt_directory: impl Into<String>) -> Result<Self, String> {
        let dirpath: PathBuf = Path::new(&ppkt_directory.into()).to_path_buf();
        let subdirs: Vec<String> = Self::get_subdirectories(&dirpath).map_err(|e|e.to_string())?;
        let mut cohorts: Vec<CohortDirectory> = Vec::new();
        for dir in subdirs {
            cohorts.push(CohortDirectory::new(dir, &dirpath)?);
        }
        Ok(Self{ 
            base_dir: dirpath,
            cohort_directories: cohorts
        })
    }


    fn get_subdirectories(dirpath: &Path) -> Result<Vec<String>, String> {
        let mut dir_list: Vec<String> = Vec::new();
        for entry in fs::read_dir(dirpath).map_err(|e|e.to_string())? {
            let entry = entry.map_err(|e|e.to_string())?;
            let metadata = entry.metadata().map_err(|e|e.to_string())?;
            let file_name = entry.file_name();
            let file_name_str = file_name.to_string_lossy();
            if file_name_str.starts_with('.') {
                continue;
            }
            if metadata.is_dir() {
                dir_list.push(file_name_str.to_string());
            }
        }
        Ok(dir_list)
    }

    /// Get a JSON representation of all input files currently in the Phenopacket Store
    /// 
    /// Assuming we point at the directory with all of the cohorts as subdirectory (currently, "notebooks"),
    /// then there is one directory for each cohort (usually a gene). Each of these directories may have
    /// a Jupyter notebook for the pyphetools project (which we ignore), as well as an 'input' directory with
    /// Excel templates (or TSV). a directory called 'phenopackets' with the generate GA4GH phenopackets
    /// 
    /// - *Returns
    ///    a JSON Value object representing the hierarchy of these files
    pub fn get_json(&self) -> Result<serde_json::Value, String> {
        serde_json::to_value(self).map_err(|e| e.to_string())
    }
}




// region:    --- Tests

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::to_string_pretty;

    #[test]
    #[ignore = "directory path needs to be adjusted to visualize JSON (but function/test is working)"]
    fn show_ppkt_store_directories()  {
        let dirpath = "/../phenopacket-store/notebooks/"; // adjust as needed to test/visualize the JSON
        let dirman = DirectoryManager::new(dirpath).unwrap(); 
        let json = dirman.get_json();
        assert!(json.is_ok());
        let json = json.unwrap();
        let pretty_json = to_string_pretty(&json).unwrap();
        print!("{}", pretty_json);
    }

    
}

// endregion: --- Tests