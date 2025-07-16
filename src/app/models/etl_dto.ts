export enum EtlColumnType {
  Raw = "Raw",
  FamilyId = "FamilyId",
  PatientId = "PatientId",
  SingleHpoTerm = "SingleHpoTerm",
  MultipleHpoTerm = "MultipleHpoTerm",
  GeneSymbol = "GeneSymbol",
  Variant = "Variant",
  Disease = "Disease",
  Age = "Age",
  Sex = "Sex",
  Ignore = "Ignore"
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
