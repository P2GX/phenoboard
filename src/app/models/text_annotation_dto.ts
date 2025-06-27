
/** We use this scheme to transport fenominal hits from the backend to frontend and back again */
export interface TextAnnotationDto {
    isFenominalHit: boolean,
    termId: string,
    label: string,
    start: number,
    end: number,
    isObserved: boolean,
    originalText: string,
    onsetString: string,
}

/** We use this to retrieve both the parents and the children of a given fenominal hit HPO term */
export interface ParentChildDto {
    parents: TextAnnotationDto[],
    children:  TextAnnotationDto[],
}



