use fenominal::fenominal::FenominalHit;

use crate::dto::text_annotation_dto::TextAnnotationDto;

/// Converts a raw input string and a list of structural hits into a sequence of
/// displayable text annotations, ensuring safe handling of Unicode character boundaries.
///
/// This function iterates through a list of `fenominal_hits` (which contain byte spans)
/// and segments the `input_text` into two types of annotations:
/// 1. Non-hit (plain) text segments, which are HTML-escaped.
/// 2. Matched hit segments, which contain associated metadata.
///
/// **Safety & Error Handling:**
///
/// Due to the nature of UTF-8 strings in Rust, slicing (`&str[start..end]`)
/// requires that the provided indices (`start` and `end`) fall exactly on
/// valid character boundaries. Indices derived from external systems (like
/// text mining tools) may sometimes be misaligned, causing a runtime panic.
///
/// To prevent crashes, this function includes a safety guard:
/// - If a hit's span exceeds the text length or is otherwise invalid, it is skipped.
/// - **Crucially, if a hit's span indices do not align with valid UTF-8 character
///   boundaries in the `input_text`, the hit is safely skipped and logged to stderr.**
///   The function continues processing the remaining text and hits, maintaining
///   the last valid index (`last_index`).
///
/// # Arguments
///
/// * `input_text`: The full, raw UTF-8 string to be annotated.
/// * `fenominal_hits`: A slice of `FenominalHit` structures, where each hit
///   contains a byte span (`hit.span.start` and `hit.span.end`) relative to
///   the `input_text`.
///
/// # Returns
///
/// A `Result` containing:
/// * `Ok(Vec<TextAnnotationDto>)`: A vector of successfully generated text annotations.
/// * `Err(String)`: An error string, though the function is primarily designed
///   to skip errors and continue (error return paths are limited to unhandled
///   internal logic failures).
///
/// # Panics
///
/// This function is designed not to panic, but relies on `html_escape::encode_text`
/// and the internal logic of `TextAnnotationDto` and `FenominalHit` being correct.
pub fn text_to_annotations(
    input_text: &str,
    fenominal_hits: &[FenominalHit],
) -> Result<Vec<TextAnnotationDto>, String> {
    let mut text_annotations = Vec::new();
    let mut last_index = 0usize;

    for hit in fenominal_hits {
        let start = hit.span.start;
        let end = hit.span.end;

        // 1. Basic Boundary Checks
        if start > input_text.len() || end > input_text.len() || start >= end {
            eprintln!("Skipping hit due to invalid span: {:?} for text length {}", hit.span, input_text.len());
            continue; // Skip hit and continue to the next one
        }
        
        // 2. CRITICAL: Validate character boundaries
        // If the start or end index is not on a valid character boundary, skip the hit.
        if !input_text.is_char_boundary(start) || !input_text.is_char_boundary(end) {
            eprintln!("Skipping hit due to non-char boundary index: {:?}", hit);
            continue; // Skip hit and continue to the next one
        }

        // non-hit text before this hit
        // The slice is now safe because 'start' and 'last_index' (which came from a verified 'end') 
        // are guaranteed to be on char boundaries.
        if start > last_index {
            let before_text = &input_text[last_index..start];
            let escaped = html_escape::encode_text(before_text);
            text_annotations.push(TextAnnotationDto::text_annot(
                escaped.to_string(),
                last_index,
                start,
            ));
        }

        // matched hit text
        let matched_text = &input_text[start..end];
        text_annotations.push(TextAnnotationDto::from_fenominal(matched_text, hit));

        last_index = end;
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
    Ok(text_annotations)
}