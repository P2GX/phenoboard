use ga4ghphetools::dto::hpo_term_dto::HpoTermDuplet;
use serde::{Deserialize, Serialize};

use crate::phenoboard::HpoMatch;
pub mod hpo_etl;
pub mod hpo_version_checker;
pub mod ontology_loader;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum MiningStatus {
    Pending,
    Confirmed,
    Skipped,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ClinicalStatus {
    Observed,
    Excluded,
    #[serde(rename = "na")]
    NotAssessed,
}

impl ClinicalStatus {
    pub fn to_string(&self) -> String {
        return match self {
            ClinicalStatus::Observed => "observed".to_string(),
            ClinicalStatus::Excluded => "excluded".to_string(),
            ClinicalStatus::NotAssessed => "na".to_string(),
        };
    }
    
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MiningConcept {
  pub(crate) original_text: String,
  pub(crate) row_index_list: Vec<usize>,
  pub(crate) suggested_terms: Vec<HpoMatch>,
  pub(crate) mining_status: MiningStatus,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MappedTerm {
    hpo_id: String,
    hpo_label: String,
    status: ClinicalStatus,
    onset: String
}

impl MappedTerm {
    pub fn new(hpo_id: &str, hpo_label: &str) -> Self {
        Self { 
            hpo_id: hpo_id.to_string(), 
            hpo_label: hpo_label.to_string(), 
            status: ClinicalStatus::Observed, 
            onset: "na".to_string()
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinedCell {
    pub(crate) cell_text: String,
    pub(crate) row_index_list: Vec<usize>,
    pub(crate) mapped_term_list: Vec<MappedTerm>,
}




