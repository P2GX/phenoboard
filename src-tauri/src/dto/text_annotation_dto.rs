//! TextAnnotationDto
//! 
//! When we send the fenominal hits to the front end, we want to allow the user to add additional
//! annotations about the age of onset. The fenominal hits are separated by text blocks with no text
//! mining hit. We put both types of annotation into the same structure that we will use to 
//! generate content in the front end.
//! A FenominalHit has term_id (String), label (String),span (Range<usize>), and is_observed (bool)

use fenominal::FenominalHit;
use serde::{Deserialize, Serialize};


/// A version of the information above that we use in the HPO text-mining process after we have
/// extracted and displayed the HPO hits and no longer care about their positions or the
/// original text.
/// Useful because it is easier to manipulate (unique)
#[deprecated(since = "0.3.0", note = "Use FenominalSentence instead")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HpoAnnotationDto {
    pub term_id: String,
    pub label: String,
    pub is_observed: bool,
    pub onset_string: String,
}



/// The following struct is usse to present the parents and children of a given term 
/// This makes it easy for use to replace a term in the GUI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParentChildDto {
    pub parents: Vec<HpoAnnotationDto>,
    pub children: Vec<HpoAnnotationDto>,
}

impl Default for ParentChildDto {
    fn default() -> Self {
        Self { 
            parents: Default::default(), 
            children: Default::default() }
    }
    
    
}
