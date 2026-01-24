

/** An interface for the results of mapping of a column header */
export interface HpoMappingResult {
  hpoLabel: string;
  hpoId: string;
  valueToStateMap: { [key: string]: string };
}

/* A match for the HPO autocomplete function */
export interface HpoMatch {
  id: string;
  label: string;
  matched_text: string;
}