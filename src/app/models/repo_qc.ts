

export type RepoErrorType =
  | 'unexpectedFile'
  | 'moiMismatch'
  | 'ppktExportError'
  | 'noHpoTermError';

export interface QcReport {
  cohortName: string;
  message: string;
  errorType: RepoErrorType;
}


export interface RepoQc {
  repoPath: string;
  cohortCount: number;
  phenopacketCount: number;
  errors: QcReport[];
}