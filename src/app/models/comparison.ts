/**
 * Represents the results of a semantic comparison between two Phenopackets.
 * Matches the Rust 'ComparisonReport' struct.
 */
export interface ComparisonReport {
  idMatch: boolean;
  idA: string;
  idB: string;
  
  addedHpo: string[];
  removedHpo: string[];
  
  addedVariants: string[];
  removedVariants: string[];
}