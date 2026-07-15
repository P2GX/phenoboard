import { HpoTermDuplet } from "./hpo_term_dto";


/** An interface for the results of mapping of a column header */
export interface HpoMappingResult {
  hpoLabel: string;
  hpoId: string;
  valueToStateMap: { [key: string]: string };
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



