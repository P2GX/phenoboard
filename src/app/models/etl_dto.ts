export enum EtlColumnType {
  raw = "raw",
  familyId = "familyId",
  patientId = "patientId",
  singleHpoTerm = "singleHpoTerm",
  multipleHpoTerm = "multipleHpoTerm",
  geneSymbol = "geneSymbol",
  variant = "variant",
  disease = "disease",
  age = "age",
  sex = "sex",
  ignore = "ignore"
}


export interface ColumnDto {
  columnType: EtlColumnType;
  transformed: boolean;
  header: string;
  values: string[];
}

export interface ColumnTableDto {
  fileName: string;
  columns: ColumnDto[];
  totalRows: number;
  totalColumns: number;
}
