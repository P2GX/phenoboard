use fenominal::fenominal::FenominalHit;

use crate::dto::text_annotation_dto::TextAnnotationDto;


pub fn text_to_annotations(
    input_text: &str,
    fenominal_hits: &[FenominalHit],
) -> Result<Vec<TextAnnotationDto>, String> {
    let mut text_annotations = Vec::new();
    let mut last_index = 0usize;
 

    for hit in fenominal_hits {
        if hit.span.start > input_text.len() || hit.span.end > input_text.len() || hit.span.start >= hit.span.end {
            return Err(format!("Invalid span {:?} for text length {}", hit.span, input_text.len()));
        }
        println!("{:?}", hit);

        // non-hit text before this hit
        if hit.span.start > last_index {
            let before_text = &input_text[last_index..hit.span.start];
            let escaped = html_escape::encode_text(before_text);
            text_annotations.push(TextAnnotationDto::text_annot(
                escaped.to_string(),
                last_index,
                hit.span.start,
            ));
        }

        // matched hit text
        let matched_text = &input_text[hit.span.start..hit.span.end];
        text_annotations.push(TextAnnotationDto::from_fenominal(matched_text, hit));

        last_index = hit.span.end;
    }

    // trailing text
    if last_index < input_text.len() {
        let tail = &input_text[last_index..];
        let escaped = html_escape::encode_text(tail);
        text_annotations.push(TextAnnotationDto::text_annot(
            escaped.to_string(),
            last_index,
            input_text.len(),
        ));
    }
    println!("{:?}", text_annotations);
    Ok(text_annotations)
}

