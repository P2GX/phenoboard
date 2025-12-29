import { DiseaseData } from "./cohort_dto";
import { HpoTermDuplet } from "./hpo_term_dto";
import { HgvsVariant, StructuralVariant } from "./variant_dto";

export enum EtlCellStatus {
  Raw = "raw",
  Transformed = "transformed",
  Error = "error",
  Ignored = "ignored"
}

export interface EtlCellValue {
  original: string;
  current: string;
  status: EtlCellStatus;
  error?: string;
}

// --- EtlColumnType ---
export enum EtlColumnType {
  Raw = "raw",
  FamilyId = "familyId",
  PatientId = "patientId",
  SingleHpoTerm = "singleHpoTerm",
  MultipleHpoTerm = "multipleHpoTerm",
  GeneSymbol = "geneSymbol",
  Variant = "variant",
  Disease = "disease",
  AgeOfOnset = "ageOfOnset",
  AgeAtLastEncounter = "ageAtLastEncounter",
  Sex = "sex",
  Deceased = "deceased",
  HpoTextMining = "hpoTextMining",
  Ignore = "ignore",
}

// --- SexCode (UPPERCASE) ---
export enum SexCode {
  M = "M",
  F = "F",
  U = "U",
  O = "O",
}

// --- DeceasedCode (snake_case) ---
export enum DeceasedCode {
  Yes = "yes",
  No = "no",
  Na = "na",
}




// --- EtlColumnHeader ---
export interface EtlColumnHeader {
  original: string;
  current?: string;
  columnType: EtlColumnType;
  hpoTerms?: HpoTermDuplet[];
}


export function newRawEtlColumnHeader(originalColumnHeader: string): EtlColumnHeader {
  return {
    original: originalColumnHeader,
    current: undefined,
    columnType: EtlColumnType.Raw,
  };
}


export interface ColumnDto {
  id: string,
  transformed: boolean;
  header: EtlColumnHeader;
  values: EtlCellValue[];
}

export function newRawColumnDto(originalHeaderContents: string, size: number): ColumnDto {
  return {
    id: crypto.randomUUID(),  
    transformed: false,
    header: newRawEtlColumnHeader(originalHeaderContents),
    values: new Array<EtlCellValue>(size),
  };
}

export interface ColumnTableDto {
  fileName: string;
  columns: ColumnDto[];
}

// --- EtlDto ---
export interface EtlDto {
  table: ColumnTableDto;
  disease: DiseaseData | null;
  pmid: string | null;
  title: string | null;
  hgvsVariants: Record<string, HgvsVariant>;
  structuralVariants: Record<string, StructuralVariant>;
}

/**
 * 
 * @param dto Our excel loading function returns a ColumnTableDto object. Everything else in our EtlDto object is optional
 * @returns Default EtlDto with the data from the ColumnTableDto
 */
export function fromColumnDto(dto: ColumnTableDto): EtlDto {
  const etl_dto: EtlDto = {
    table: dto,
    disease: null,
    pmid: null,
    title: null,
    hgvsVariants: {} as Record<string, HgvsVariant>,
    structuralVariants: {} as Record<string, StructuralVariant>,
  };
  return etl_dto;
}
