export interface TextAnnotationDto {
    isFenominalHit: boolean,
    termId: string,
    label: string,
    start: number,
    end: number,
    isObserved: boolean,
    originalText: string,
}

/*
pub struct TextAnnotationDto {
    /// true if this is a fenominal hit, false for the intervening text segments
    pub is_fenominal_hit: bool,
    pub term_id: String,
    pub label: String,
    pub start: usize,
    pub end: usize,
    pub is_observed: bool,
    pub original_text: String,
}*/