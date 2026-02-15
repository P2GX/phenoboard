

use crate::util::HgncBundle;



pub async fn fetch_gene_data(symbol: &str) -> Result<HgncBundle, Box<dyn std::error::Error>> {
    let url = format!("https://rest.genenames.org/fetch/symbol/{}", symbol);
    println!("{}", url);
    let client = reqwest::Client::new();

    let res = client
        .get(&url)
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await?;
    let body = res.text().await?;
    let bundle = parse_hgnc_json(&body)?;
    Ok(bundle)
}

fn parse_hgnc_json(json_str: &str) -> Result<HgncBundle, Box<dyn std::error::Error>> {
    let v: serde_json::Value = serde_json::from_str(json_str)?;
    let num_found = v["response"]["numFound"]
        .as_u64()
        .ok_or("Could not find 'numFound' in response")?;

    if num_found != 1 {
        return Err(format!("Expected 1 gene, found {}", num_found).into());
    }
    let doc = &v["response"]["docs"][0];
    if doc.is_null() {
        return Err("Response docs array is empty".into());
    }
    let hgnc_id = doc["hgnc_id"]
        .as_str()
        .ok_or("hgnc_id missing or not a string")?
        .to_string();
    let mane_select_array = doc["mane_select"]
        .as_array()
        .ok_or("mane_select missing or not an array")?;

    let mane_select = mane_select_array
        .iter()
        .filter_map(|val| val.as_str())
        .find(|s| s.starts_with("NM_"))
        .ok_or("No RefSeq (NM_...) entry found in mane_select")?
        .to_string();

    Ok(HgncBundle{ hgnc_id, mane_select})
}



#[cfg(test)]
mod tests {
    use super::*; // Assumes your logic is in the same crate
   

 
    #[tokio::test]
    #[ignore = "API call"]
    async fn test_fetch_gene_data() {
        let symbol = "BRAF";
        let expected_hgnc = "HGNC:1097";
        let expected_mane = "NM_004333.6";
        let bundle = fetch_gene_data(symbol).await.expect("API call failed");
        assert_eq!(expected_hgnc, bundle.hgnc_id);
        assert_eq!(expected_mane, bundle.mane_select);
        
        
    }

    #[test]
    fn test_parsing_logic() {
        let raw_json = r#"{"response":{"numFound":1,"docs":[{"hgnc_id":"HGNC:1097","mane_select":["ENST00000646891.2","NM_004333.6"]}]}}"#;
        let bundle = parse_hgnc_json(raw_json).unwrap();
        assert_eq!(bundle.hgnc_id, "HGNC:1097");
        assert_eq!(bundle.mane_select, "NM_004333.6");
    }


}