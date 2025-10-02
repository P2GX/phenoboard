import { CellValue, HpoTermData, HpoTermDuplet } from "./hpo_term_dto";

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

/** We use the TextAnnotationDto for adding new terms in the HpoPolishing component. This could be refactored */
export function to_annotation_dto(duplet: HpoTermDuplet): TextAnnotationDto {
    const annot: TextAnnotationDto = {
        isFenominalHit: true,
        termId: duplet.hpoId,
        label: duplet.hpoLabel,
        start: -1,
        end: -1,
        isObserved: true,
        originalText: "na",
        onsetString: "na"
    } ;
    return annot;
}

/** We use this to retrieve both the parents and the children of a given fenominal hit HPO term */
export interface ParentChildDto {
    parents: TextAnnotationDto[],
    children:  TextAnnotationDto[],
}







