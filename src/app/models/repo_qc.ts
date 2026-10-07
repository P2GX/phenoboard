export type QcIssueDomain = 'Cohort' | 'Ontology' | 'Parse' | 'Annotation' | 'Message';

export interface QcIssue {
  domain: QcIssueDomain;
  message: string;
}

export interface QcReport {
  cohortName: string;
  sourcePath: string | null;
  issues: QcIssue[];
}

export interface RepoQc {
  repoPath: string;
  cohortCount: number;
  errors: QcReport[];
}
