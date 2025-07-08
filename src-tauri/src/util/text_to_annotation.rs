use fenominal::fenominal::FenominalHit;

use crate::dto::text_annotation_dto::TextAnnotationDto;


pub fn text_to_annotations(input_text: &str, fenominal_hits: &Vec<FenominalHit>) -> Result<Vec<TextAnnotationDto>, String> {
    let mut text_annotations: Vec<TextAnnotationDto> = Vec::new();
    let mut last_index = 0;
    for hit in fenominal_hits {
        let text = &html_escape::encode_text(&input_text[last_index..hit.span.start]);
        let text_dto = TextAnnotationDto::text_annot(text.to_string(), last_index, hit.span.start);
        let matched_text = &input_text[hit.span.clone()];
        text_annotations.push(text_dto); // text in between the HPO hits, needed for display!
        let hpo_dto = TextAnnotationDto::from_fenominal(matched_text, hit);
        text_annotations.push(hpo_dto);

        last_index = hit.span.end;
    }
    // Add any remaining text after last hit
    let text = &html_escape::encode_text(&input_text[last_index..]);
    if text.len() > 0 {
        let last_pos = last_index + text.len();
        let text_dto = TextAnnotationDto::text_annot(text.to_string(), last_index, last_pos);
        text_annotations.push(text_dto);
    }
    Ok(text_annotations)
}
