import { DiseaseData } from "./cohort_dto";
import { HpoTermDuplet } from "./hpo_term_dto";

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

// --- ColumnMetadata (serde tagged union: kind + data) ---
export type ColumnMetadata =
  | { kind: "raw" }
  | { kind: "hpoTerms"; data: HpoTermDuplet[] }
  | { kind: "geneTranscript"; data: { geneSymbol: string; transcriptId: string } }
  | { kind: "sex"; data: { code: SexCode } }
  | { kind: "deceased"; data: { code: DeceasedCode } }
  | { kind: "freeText"; data: string };


// --- EtlColumnHeader ---
export interface EtlColumnHeader {
  original: string;
  current?: string;
  columnType: EtlColumnType;
  metadata: ColumnMetadata;
}


export function newRawEtlColumnHeader(originalColumnHeader: string): EtlColumnHeader {
  return {
    original: originalColumnHeader,
    current: undefined,
    columnType: EtlColumnType.Raw,
    metadata: { kind: "raw" },
  };
}


export interface ColumnDto {
  id: string,
  transformed: boolean;
  header: EtlColumnHeader;
  values: string[];
}

export function newRawColumnDto(originalHeaderContents: string, size: number): ColumnDto {
  return {
    id: crypto.randomUUID(),  
    transformed: false,
    header: newRawEtlColumnHeader(originalHeaderContents),
    values: new Array<string>(size),
  };
}

export interface ColumnTableDto {
  fileName: string;
  columns: ColumnDto[];
}

// --- EtlDto ---
export interface EtlDto {
  table: ColumnTableDto;
  disease: DiseaseData;
  pmid: string;
  title: string;
}