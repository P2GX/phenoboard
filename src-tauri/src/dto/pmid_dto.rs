use serde::Serialize;

#[derive(Debug,Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PmidDto {
    /// Full PMID with no whitespace, e.g. 'PMID:12345'
    pub pmid: String,
    /// Title of corresponding article
    pub title: String,
}

impl PmidDto {
    pub fn new(pmid: &str, title: &str) -> Self {
        Self {
            pmid: pmid.to_string(),
            title: title.to_string()
        }
    }

    pub fn from_numerical_pmid(num_pmid: &str, title: &str) -> Self {
        let pmid = format!("PMID:{}", num_pmid);
        Self::new(&pmid, title)
    }
}