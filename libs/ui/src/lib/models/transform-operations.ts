import { PolishedHpoAnnotation } from "ng-hpo-uikit";
import { DiseaseData } from "./cohort_dto";
import { CellValue, CellValueInner, HpoTermDuplet } from "./hpo_term_dto";
import { HgvsVariant, IntergenicHgvsVariant, StructuralVariant } from "./variant_dto";

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


export enum SexCode {
  M = "M",
  F = "F",
  U = "U",
  O = "O",
}

export enum DeceasedCode {
  Yes = "yes",
  No = "no",
  Na = "na",
}

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
  header: EtlColumnHeader;
  values: EtlCellValue[];
}

export function newRawColumnDto(originalHeaderContents: string, size: number): ColumnDto {
  return {
    id: crypto.randomUUID(),  
    header: newRawEtlColumnHeader(originalHeaderContents),
    values: new Array<EtlCellValue>(size),
  };
}

export interface ColumnTableDto {
  fileName: string;
  columns: ColumnDto[];
}


export interface EtlDto {
  table: ColumnTableDto;
  disease: DiseaseData | null;
  pmid: string | null;
  title: string | null;
  hgvsVariants: Record<string, HgvsVariant>;
  structuralVariants: Record<string, StructuralVariant>;
  intergenicVariants: Record<string, IntergenicHgvsVariant>;
}

/**
 * The ColumnTableDto is created by our excel loading function are represents the contents of an external
 * Excel file (usually, a supplemental file from a publication about a cohort of individuals). The EtlDto
 * object stores this information and adds new data to be able to transform the DTO into a CohortData object.
 * We initial the other data as null/empty here.
 * @param dto A ColumnTableDto object. Everything else in our EtlDto object is optional
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
    intergenicVariants: {} as Record<string, IntergenicHgvsVariant>,
  };
  return etl_dto;
}



/**
 * All possible transformation operations
 */
export enum TransformType {
  SINGLE_HPO_TERM = "SINGLE_HPO_TERM",
  MULTIPLE_HPO_TERM = "MULTIPLE_HPO_TERM",
  ONSET_AGE = 'ONSET_AGE',
  LAST_ENCOUNTER_AGE = 'LAST_ENCOUNTER_AGE',
  SEX_COLUMN = 'SEX_COLUMN',
  SPLIT_COLUMN = "SPLIT_COLUMN",
  STRING_SANITIZE = 'STRING_SANITIZE',
  REMOVE_WHITESPACE = "REMOVE_WHITESPACE",
  TO_UPPERCASE = 'TO_UPPERCASE',
  TO_LOWERCASE = 'TO_LOWERCASE',
  EXTRACT_NUMBERS = 'EXTRACT_NUMBERS',
  REPLACE_UNIQUE_VALUES = 'REPLACE_UNIQUE_VALUES',
  ONSET_AGE_ASSUME_YEARS = "ONSET_AGE_ASSUME_YEARS",
  LAST_ECOUNTER_AGE_ASSUME_YEARS = "LAST_ECOUNTER_AGE_ASSUME_YEARS",
  ANNOTATE_VARIANTS="ANNOTATE_VARIANTS variants",
  DELETE_COLUMN="DELETE_COLUMN",
  DUPLICATE_COLUMN="DUPLICATE_COLUMN",
  CONSTANT_COLUMN="CONSTANT_COLUMN",
  RAW_COLUMN_TYPE="RAW_COLUMN_TYPE",
  FAMILY_ID_COLUMN_TYPE="FAMILY_ID_COLUMN_TYPE",
  INDIVIDUAL_ID_COLUMN_TYPE="INDIVIDUAL_ID_COLUMN_TYPE",
  GENE_SYMBOL_COLUMN_TYPE="GENE_SYMBOL_COLUMN_TYPE",
  DISEASE_COLUMN_TYPE="DISEASE_COLUMN_TYPE",
  SEX_COLUMN_TYPE="SEX_COLUMN_TYPE",
  DECEASED_COLUMN_TYPE="DECASED_COLUMN_TYPE",
  IGNORE_COLUMN_TYPE="IGNORE_COLUMN_TYPE"
}


/* display labels for the transforms */
export const TransformLabels: Record<TransformType, string> = {
  [TransformType.SINGLE_HPO_TERM]: "Single HPO Term",
  [TransformType.SEX_COLUMN]: "Sex Column",
  [TransformType.MULTIPLE_HPO_TERM]: 'Multiple HPO Terms...',
  [TransformType.ONSET_AGE]: 'Onset age',
  [TransformType.SPLIT_COLUMN]: 'Split Column',
  [TransformType.STRING_SANITIZE]: 'Sanitize (trim/ASCII)',
  [TransformType.REMOVE_WHITESPACE]: 'Remove all whitespace',
  [TransformType.TO_UPPERCASE]: 'To Uppercase',
  [TransformType.TO_LOWERCASE]: 'To Lowercase',
  [TransformType.EXTRACT_NUMBERS]: 'Extract Numbers',
  [TransformType.REPLACE_UNIQUE_VALUES]: 'Replace Unique Values',
  [TransformType.ONSET_AGE_ASSUME_YEARS]: 'Onset Age (Assume Years)',
  [TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS]: 'Last Encounter Age (Assume Years)',
  [TransformType.ANNOTATE_VARIANTS]: 'Annotate variants',
  [TransformType.DELETE_COLUMN]: 'Delete Column',
  [TransformType.DUPLICATE_COLUMN]: 'Duplicate Column',
  [TransformType.CONSTANT_COLUMN]: 'Add constant column to right',
  [TransformType.RAW_COLUMN_TYPE]: 'Raw (Reset)',
  [TransformType.FAMILY_ID_COLUMN_TYPE]: 'Family ID',
  [TransformType.INDIVIDUAL_ID_COLUMN_TYPE]: 'Individual ID',
  [TransformType.GENE_SYMBOL_COLUMN_TYPE]: 'Gene symbol',
  [TransformType.DISEASE_COLUMN_TYPE]: 'Disease',
  [TransformType.SEX_COLUMN_TYPE]: 'Sex',
  [TransformType.DECEASED_COLUMN_TYPE]: 'Deceased',
  [TransformType.IGNORE_COLUMN_TYPE]: 'Ignore',
  [TransformType.LAST_ENCOUNTER_AGE]: 'Age at last encounter'
};


/**
 * Interface for organizing the UI Menu
 */
export interface TransformCategory {
  label: string;
  transforms: TransformType[];
}

/**
 * Type alias for your function maps. If the String Transform returns "undefined", we will interpret as an error
 */
export type StringTransformFn = (input: string) => string | undefined;
export type ActionTransformFn = (colIndex: number) => void;




export type ColumnTypeColorMap = { [key in EtlColumnType]: string };
export const columnTypeColors: ColumnTypeColorMap = {
    [EtlColumnType.Raw]: '#ffffff',
    [EtlColumnType.FamilyId]: '#f0f8ff',
    [EtlColumnType.PatientId]: '#e6ffe6',
    [EtlColumnType.SingleHpoTerm]: '#fff0f5',
    [EtlColumnType.MultipleHpoTerm]: '#ffe4e1',
    [EtlColumnType.GeneSymbol]: '#f5f5dc',
    [EtlColumnType.Variant]: '#f0fff0',
    [EtlColumnType.Disease]: '#fdf5e6',
    [EtlColumnType.AgeOfOnset]: '#e0ffff',
    [EtlColumnType.AgeAtLastEncounter]: '#e0ffff',
    [EtlColumnType.Deceased]: '#f5f5f5',
    [EtlColumnType.Sex]: '#f5f5f5',
    [EtlColumnType.Ignore]: '#d3d3d3',
    [EtlColumnType.HpoTextMining]: '#e0ffff'
  };


  export const TransformToColumnTypeMap: Partial<Record<TransformType, EtlColumnType>> = {
    [TransformType.RAW_COLUMN_TYPE]: EtlColumnType.Raw,
    [TransformType.FAMILY_ID_COLUMN_TYPE]: EtlColumnType.FamilyId,
    [TransformType.INDIVIDUAL_ID_COLUMN_TYPE]: EtlColumnType.PatientId,
    [TransformType.GENE_SYMBOL_COLUMN_TYPE]: EtlColumnType.GeneSymbol,
    [TransformType.DISEASE_COLUMN_TYPE]: EtlColumnType.Disease,
    [TransformType.ONSET_AGE]: EtlColumnType.AgeOfOnset,
    [TransformType.SEX_COLUMN_TYPE]: EtlColumnType.Sex,
    [TransformType.SEX_COLUMN]: EtlColumnType.Sex,
    [TransformType.DECEASED_COLUMN_TYPE]: EtlColumnType.Deceased,
    [TransformType.IGNORE_COLUMN_TYPE]: EtlColumnType.Ignore,
    [TransformType.ONSET_AGE_ASSUME_YEARS]: EtlColumnType.AgeOfOnset,
    [TransformType.LAST_ECOUNTER_AGE_ASSUME_YEARS]: EtlColumnType.AgeAtLastEncounter,
    [TransformType.LAST_ENCOUNTER_AGE]: EtlColumnType.AgeAtLastEncounter,
  };


export const TransformPolishingElementsSet: Set<TransformType> = new Set([
      TransformType.STRING_SANITIZE,
      TransformType.REMOVE_WHITESPACE,
      TransformType.TO_UPPERCASE,
      TransformType.TO_LOWERCASE,
      TransformType.EXTRACT_NUMBERS,
]);


export function toCellValue(annotation: PolishedHpoAnnotation): CellValue {
  const modifiers = annotation.modifiers.length > 0
    ? annotation.modifiers.map(m => m.termId) // assumes HpoTermMinimal has a `termId` field
    : undefined;

  const inner: CellValueInner = annotation.excluded
    ? { type: "Excluded" }
    : annotation.onsetString
      ? { type: "OnsetAge", data: annotation.onsetString }
      : { type: "Observed" };

  return modifiers ? { ...inner, modifiers } : inner;
}
