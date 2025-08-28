export interface CohortDescriptionDto {
    valid: boolean;
    cohortType: string;
    numIndividuals: number;
    numHpos: number;
    diseaseLabel: string;
    diseaseId: string;
    diseaseDatabase: string;
    geneSymbol: string;
    hgncId: string;
    transcript: string;
}

/** The following is used if we cannot generate a valid description */
export const EMPTY_COHORT_DESCRIPTION: CohortDescriptionDto = {
  valid: false,
  cohortType: "",
  numIndividuals: 0,
  numHpos: 0,
  diseaseLabel: "",
  diseaseId: "",
  diseaseDatabase: "",
  geneSymbol: "",
  hgncId: "",
  transcript: ""
};