use serde::Serialize;

#[derive(Debug,Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusDto {
    pub hpo_loaded: bool,
    pub hpo_version: String,
    pub n_hpo_terms: usize,
    pub pt_template_path: String,
    pub pt_template_loaded: bool,
    pub cohort_name: String,
    pub n_phenopackets: usize,
    pub new_cohort: bool,
    pub unsaved_changes: bool,
    pub has_error: bool,
    pub error_message: String,
}

impl Default for StatusDto {
    fn default() -> Self {
        Self { 
            hpo_loaded: false, 
            hpo_version: Default::default(), 
            n_hpo_terms: 0 as usize, 
            pt_template_path: Default::default(), 
            pt_template_loaded: false,
            cohort_name: Default::default(), 
            n_phenopackets: Default::default(), 
            new_cohort: false, 
            unsaved_changes: false,
            has_error: false,
            error_message: String::default(),
        }
    }
}
