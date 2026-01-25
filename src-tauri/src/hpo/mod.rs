use serde::{Deserialize, Serialize};

use crate::phenoboard::HpoMatch;

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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MiningConcept {
  pub(crate) original_text: String,
  pub(crate) suggested_terms: Vec<HpoMatch>,
  pub(crate) mining_status: MiningStatus,
  pub(crate) clinical_status: ClinicalStatus,
  pub(crate) onset_string: Option<String>
}
