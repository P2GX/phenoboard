use serde::{Deserialize, Serialize};


pub mod io_util;
pub mod pubmed_retrieval;
pub mod text_to_annotation;
mod hgnc_rest;

#[derive(Deserialize, Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HgncBundle {
    hgnc_id: String,
    mane_select: String,
}

pub async fn fetch_hgnc_data(symbol: &str) -> Result<HgncBundle, String> {
    let bundle = hgnc_rest::fetch_gene_data(symbol)
        .await
        .map_err(|e| e.to_string())?;
    Ok(bundle)
}