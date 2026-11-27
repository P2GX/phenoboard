import { HpoTermDuplet } from "ng-hpo-uikit";

export type QcIssueDomain = 'Cohort' | 'Ontology' | 'Parse' | 'Annotation' | 'Message';

export interface QcIssue {
  domain: QcIssueDomain;
  message: string;
}

export interface QcReport {
  cohortName: string;
  issues: QcIssue[];
}

export interface RepoQc {
  repoPath: string;
  cohortCount: number;
  errors: QcReport[];
}

export interface OnsetConflict {
  rowIndex: number; individualId: string; pmid: string;
  redundantTerm: HpoTermDuplet; redundantOnset: string;
  specificTerm: HpoTermDuplet; specificOnset: string | null;
}

export interface OnsetResolution {
  rowIndex: number; redundantTermId: string; moveTo: string | null;
}
