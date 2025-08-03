//! TextAnnotationDto
//! 
//! When we send the fenominal hits to the front end, we want to allow the user to add additional
//! annotations about the age of onset. The fenominal hits are separated by text blocks with no text
//! mining hit. We put both types of annotation into the same structure that we will use to 
//! generate content in the front end.
//! A FenominalHit has term_id (String), label (String),span (Range<usize>), and is_observed (bool)

use fenominal::fenominal::FenominalHit;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextAnnotationDto {
    /// true if this is a fenominal hit, false for the intervening text segments
    pub is_fenominal_hit: bool,
    pub term_id: String,
    pub label: String,
    pub start: usize,
    pub end: usize,
    pub is_observed: bool,
    pub original_text: String,
    pub onset_string: String,
}

impl TextAnnotationDto {
    pub fn text_annot(text: impl Into<String>, start: usize, end: usize) -> Self {
        let mut dto = TextAnnotationDto::default();
        dto.original_text = text.into();
        dto.start = start;
        dto.end = end;

        dto
    }

    pub fn from_fenominal(text: impl Into<String>, hit: &FenominalHit) -> Self {
        let mut dto = TextAnnotationDto::default();
        dto.is_fenominal_hit = true;
        dto.term_id = hit.term_id.clone();
        dto.label = hit.label.clone();
        dto.start = hit.span.start;
        dto.end = hit.span.end;
        dto.is_observed = hit.is_observed;
        dto.original_text = text.into();

        dto
    }

    /// We create a TextAnnotationDto derived from autocomplete
    /// This is designed to be added to the fenominal hit table after text mining
    /// TODO. it is not elegant to misuse the is_fenominal_hit label, and
    /// we should change the label to is_hpo_term
    pub fn autocompleted_fenominal_hit(term_id: &str, term_label: &str) -> Self {
        let mut dto = TextAnnotationDto::default();
        dto.term_id = term_id.to_string();
        dto.label = term_label.to_string();
        dto.is_fenominal_hit = true;
        dto.is_observed = true;
        dto
    }
    
}

impl Default for TextAnnotationDto {
    fn default() -> Self {
        Self { 
            is_fenominal_hit:false, 
            term_id: String::default(), 
            label:  String::default(), 
            start: 0 as usize, 
            end:  0 as usize,
            is_observed: false, 
            original_text: String::default(),
            onset_string: "na".to_string(),
        }
    }
}

/// The following struct is usse to present the parents and children of a given term 
/// This makes it easy for use to replace a term in the GUI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParentChildDto {
    pub parents: Vec<TextAnnotationDto>,
    pub children: Vec<TextAnnotationDto>,
}

impl Default for ParentChildDto {
    fn default() -> Self {
        Self { 
            parents: Default::default(), 
            children: Default::default() }
    }
    
    
}
