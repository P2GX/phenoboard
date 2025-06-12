
use serde::Deserialize;
use crate::dto::pmid_dto::PmidDto;

#[derive(Debug, Deserialize)]
struct PubmedResponse {
    result: PubmedResult,
}

#[derive(Debug, Deserialize)]
struct PubmedResult {
    #[serde(rename = "uids")]
    uids: Vec<String>,
    #[serde(flatten)]
    records: std::collections::HashMap<String, ArticleRecord>,
}

#[derive(Debug, Deserialize)]
struct ArticleRecord {
    title: Option<String>,
}

pub struct PubmedRetriever {
    numerical_pmid: String,
}

impl PubmedRetriever {

    pub fn new(pmid: &str) -> Result<Self, String> {
        match Self::extract_pmid(pmid) {
            Some(pmid) => Ok(Self { numerical_pmid: pmid}),
            None => Err(format!("Could not extract PMID from {pmid}")),
        }
    }

    pub async fn get(&self) -> Result<PmidDto, String> {
        let title = match self.fetch_article_title().await {
            Ok(Some(title)) => title,
            Ok(None) => { return Err("No title found".to_string()) },
            Err(e) => {return Err(e.to_string())},
        };
        Ok(PmidDto::from_numerical_pmid(&self.numerical_pmid, &title))
    }
    

    /// We might get PMIDs in one of three input formats: 'PMID: 20802478', 'PMID:20802478', and '20802478', and in some cases there
    /// may be leading or trailing whitespace. This function returns the numerical part ('20802478'), which is what we need for the 
    /// eUtils API
    pub fn extract_pmid(input: &str) -> Option<String> {
        input
            .to_uppercase()
            .replace("PMID:", "")
            .trim()
            .parse::<u32>()
            .ok()
            .map(|n| n.to_string())
    }

    async fn fetch_article_title(&self) -> Result<Option<String>, String> {
        let url = format!(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={}&retmode=json",
            &self.numerical_pmid
        );

        let response = reqwest::get(&url).await.map_err(|e|e.to_string())?;
        let json: PubmedResponse = response.json().await.map_err(|e|e.to_string())?;

        if let Some(record) = json.result.records.get(&self.numerical_pmid) {
            Ok(record.title.clone())
        } else {
            Ok(None)
        }
    }
}






// region:    --- Tests

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn fetch_pmid_test() -> Result<(), Box<dyn std::error::Error>> {
        let pmid = "20802478";
        let retr = PubmedRetriever::new(pmid).unwrap();
        let result = retr.get().await;
        assert!(result.is_ok());
        let dto = result.unwrap();
        println!("{}", &dto.title);
        assert!(dto.title.contains("PIGV"));
        Ok(())
    }

    #[tokio::test]
    async fn test_pmid_conversion() {
        let pmid = "PMID: 20802478";
        let retr = PubmedRetriever::new(pmid).unwrap();
        assert_eq!("20802478", retr.numerical_pmid);
    }

}
// endregion: --- Tests
