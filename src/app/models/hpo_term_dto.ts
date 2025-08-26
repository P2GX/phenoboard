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


export type CellValue =
  | { type: "Observed" }
  | { type: "Excluded" }
  | { type: "Na" }
  | { type: "OnsetAge"; data: string }
  | { type: "Modifier"; data: string };


function renderCell(cell: CellValue): string {
  switch (cell.type) {
    case "Observed":
      return "✓ Observed";
    case "Excluded":
      return "✗ Excluded";
    case "Na":
      return "Not available";
    case "OnsetAge":
      return `Onset at ${cell.data}`;
    case "Modifier":
      return `Modifier: ${cell.data}`;
    default: {
      const _exhaustive: never = cell;
      return _exhaustive;
    }
  }
}


export interface  HpoTermData {
    termDuplet: HpoTermDuplet;
    entry: CellValue, 
}