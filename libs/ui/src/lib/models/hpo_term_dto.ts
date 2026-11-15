export interface HpoAnnotationDto {
    label: string;      // e.g., "nystagmus"
    id: string;         // e.g., "HP:0000639"
    status: 'observed' | 'excluded' | 'na'; // results from fenominal 
    onset: string;    // e.g., 'Congenital onset', 'P3Y2D'
}


export interface HpoTermDuplet {
    hpoLabel: string;
    hpoId: string;
}


export type CellValueInner =
  | { type: "Observed" }
  | { type: "Excluded" }
  | { type: "Na" }
  | { type: "OnsetAge"; data: string };

/*
 * Corresponds to JSON like this:
 * const example: CellValue = {
 *   type: "OnsetAge",
 *   data: "P10Y",
 *   modifiers: ["HP:0000123"]
 * };
 */
export type CellValue = CellValueInner & {
  modifiers?: string[]; 
};

export function renderCellValue(cell: CellValue): string {
  switch (cell.type) {
    case "Observed":
      return "✓ Observed";
    case "Excluded":
      return "✗ Excluded";
    case "Na":
      return "Not available";
    case "OnsetAge":
      return `Onset at ${cell.data}`;
    default: {
      const _exhaustive: never = cell;
      return _exhaustive;
    }
  }
}

/**
 * Parse a cell string into a CellValue.
 *
 * Accepted forms (case-insensitive for the status keywords):
 *   "observed" | "excluded" | "na"
 *   "observed;HP:0012828"          -> status plus modifier(s), ';'-separated
 *   "P10Y", "G20w3d", "Infantile onset"  -> OnsetAge (anything else non-empty)
 */
export function getCellValue(value: string): CellValue {
  const [head, ...rest] = (value ?? '').split(';').map(s => s.trim());
  const modifiers = rest.filter(s => s.length > 0);
  const withMods = (inner: CellValueInner): CellValue =>
    modifiers.length > 0 ? { ...inner, modifiers } : inner;

  switch (head.toLowerCase()) {
    case 'observed':
      return withMods({ type: 'Observed' });
    case 'excluded':
      return withMods({ type: 'Excluded' });
    case '':
    case 'na':
      return withMods({ type: 'Na' });
    default:
      // Not a status keyword, so treat the first segment as an onset age/label.
      return withMods({ type: 'OnsetAge', data: head });
  }
}


export interface  HpoTermData {
    termDuplet: HpoTermDuplet;
    entry: CellValue, 
}

/** Possible values for HPO cells in the columns
 * observed:HP:0012825 -> Mild
 * observed:HP:0012826 -> Moderate 
 * observed:HP:0012828 -> Severe 
 */
export type HpoStatus = 'observed' | 'excluded' | 'na'| 'observed;HP:0012825' | 'observed;HP:0012826' | 'observed;HP:0012828';
/** Mapping entry: a term + its current status */
export interface HpoMappingEntry {
  term: HpoTermDuplet;
  status: HpoStatus;
}
export type HpoMappingRow = HpoMappingEntry[];


/** An interface for the results of mapping of a column header */
export interface HpoMappingResult {
  hpoLabel: string;
  hpoId: string;
  valueToStateMap: { [key: string]: CellValue };
}

/* A match for the HPO autocomplete function (Rust version from the fenominal library)*/
export interface OntologyMatch {
  id: string;
  label: string;
  matchedText: string;
}


export enum MiningStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Skipped = 'skipped'
}

export enum ClinicalStatus {
  Observed = 'observed',
  Excluded = 'excluded',
  NotAssessed = 'na'
}

// This is used by the second step of the Multi-HPO mapper
export interface MiningConcept {
  originalText: string;
  rowIndexList: number[];
  suggestedTerms: OntologyMatch[];
  miningStatus: MiningStatus;
}


export interface MappedTerm {
  hpoId: string;
  hpoLabel: string;
  status: ClinicalStatus;
  onset: string; 
}

export interface MinedCell {
  cellText: string;
  rowIndexList: number[];
  mappedTermList: MappedTerm[],
}


