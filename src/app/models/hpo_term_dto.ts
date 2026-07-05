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

export function getCellValue(value: string): CellValue {
    switch(value) {
        case "observed":
            return {type: "Observed"};
        case "excluded":
            return { type: "Excluded"}
        case "na":
            return { type: "Na"}
        default:
            return { type: "OnsetAge", data: value };
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