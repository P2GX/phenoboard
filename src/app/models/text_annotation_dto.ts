import { HpoTermDuplet } from '../../../libs/ui/src/lib/models/hpo_term_dto';

/** We use this scheme to transport fenominal hits from the backend to frontend and back again */
export interface TextAnnotationDto {
  isFenominalHit: boolean;
  termId: string;
  label: string;
  start: number;
  end: number;
  isObserved: boolean;
  originalText: string;
  onsetString: string;
}

/** Mirrors Rust's `std::ops::Range<usize>`, which serde serializes as `{ start, end }`. */
interface Span {
  start: number;
  end: number;
}
/** A named entity identified by text mining. */
interface FenominalHit {
  termId: string;
  label: string;
  span: Span;
  excluded: boolean;
}
/** A contiguous piece of a sentence: either a recognized entity or plain text. */
type FenominalSegment =
  | {
      kind: 'hit';
      text: string;
      hit: FenominalHit;
    }
  | {
      kind: 'text';
      text: string;
      span: Span;
    };
/** A sentence of the original text. */
interface FenominalSentence {
  start: number;
  originalText: string;
  segments: FenominalSegment[];
}

/** We use this in the HpoPolishing component to extract unique HPO annotations where
 * we no longer care about the position or the original string.
 */
export interface HpoAnnotationDto {
  termId: string;
  label: string;
  isObserved: boolean;
  onsetString: string;
}

export function textAnnotationToHpoAnnotation(annot: TextAnnotationDto): HpoAnnotationDto {
  const hpoAnnot: HpoAnnotationDto = {
    termId: annot.termId,
    label: annot.label,
    isObserved: annot.isObserved,
    onsetString: annot.onsetString,
  };
  return hpoAnnot;
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
    originalText: 'na',
    onsetString: 'na',
  };
  return annot;
}

/** We use this to retrieve both the parents and the children of a given fenominal hit HPO term */
export interface ParentChildDto {
  parents: HpoAnnotationDto[];
  children: HpoAnnotationDto[];
}
