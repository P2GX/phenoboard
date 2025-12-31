export interface QcReport {
  cohortName: string;
  message: string;
  isOk: boolean;
}


export interface RepoQc {
  repoPath: string;
  cohortCount: number;
  phenopacketCount: number;
  errors: QcReport[];
}