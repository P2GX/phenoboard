

/** An interface for the results of mapping of a column header */
export interface HpoMappingResult {
  hpoLabel: string;
  hpoId: string;
  valueToStateMap: { [key: string]: string };
}