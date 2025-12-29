import { CohortData, GeneTranscriptData, RowData } from "./cohort_dto";



export interface StructuralType {
    label: string;
    id: string;
} 

/**
 * Types of variants we may want to validate. HGVS is c./n. small variants, PreciseSv is a type
 * of structural variant with precise positions (not implemented yet), and the others are symbolic
 * structural variants such as DEL Ex 5-8
 */
export type VariantType =
  | "HGVS"
  | "DEL"
  | "INV"
  | "TRANSL"
  | "DUP"
  | "SV"
  | "PRECISESV"
  | "INTERGENICHGVS"
  | "UNKNOWN";

  /**
 * Simple structure to combine some data about a variant we have validated or still need to 
 * validate. The information is mainly use to display the status of a variant in the GUI. Note
 * that the alleles inthe phenopacket use the vairantKey to extract the full information from 
 * one of the two variant maps (for HGVS and SV). We do not persist this DTO, it is designed merely
 * to simplify handling of data for display in the GUI.
 */

export interface VariantDto {
  /** either an HGVS String (e.g., c.123T>G) or a SV String: DEL: deletion of exon 5 */
  variantString: string;
  /** Key to be used in the HashMap */
  variantKey?: string | null;
  /** transcript of reference for the gene of interest (usually MANE) with version number, e.g. NM_000123.2 */
  transcript: string;
  /** HUGO Gene Nomenclature Committee identifier, e.g., HGNC:123 */
  hgncId: string;
  /** Symbol recommended by HGNC, e.g. FBN1 */
  geneSymbol: string;
  /** type of variant category */
  variantType: VariantType;
  /** Was this variant validated in the backend? */
  isValidated: boolean;
  /** How many alleles were reported with this variant in the cohort? */
  count: number;
}


export function createHgvsValidationDto(
    variantString: string,
    transcript: string,
    hgncId: string,
    geneSymbol: string,
): VariantDto {
    return {
      variantString,
      transcript,
      hgncId,
      geneSymbol,
      variantType: 'HGVS',
      isValidated: false,
      count: 0
    };
}


export interface HgvsVariant {
  assembly: string;
  chr: string;
  position: number; // u32 → number in TS
  refAllele: string;
  altAllele: string;
  symbol: string;
  hgncId: string;
  hgvs: string;
  transcript: string;
  gHgvs: string;
  pHgvs?: string; // corresponds to Option<String> in Rust
  variantKey: string;
}

export interface IntergenicHgvsVariant {
    assembly: String;
    chr: String;
    position: number; // u32 in rust,
    refAllele: string;
    altAllele: string;
    symbol?: string;
    hgncId?: string;
    gHgvs: string;
    geneHgvs?: string;
    variantKey: string 
}


/** 
 * The kind of structural variant being sent for validation.
 */
export enum SvType {
  DEL = 'DEL',
  INV = 'INV', 
  TRANSL = 'TRANSL',
  DUP = 'DUP',
  SV = 'SV'
}

export interface StructuralVariant {
  label: string;
  geneSymbol: string;
  transcript: string;
  hgncId: string;
  svType: SvType;
  chromosome: string;
  variantKey: string
}





export function displayHgvs(hgvs: HgvsVariant, validated: boolean): VariantDto {
  const vdd: VariantDto = {
    variantString: hgvs.hgvs,
    variantKey: hgvs.variantKey,
    geneSymbol: hgvs.symbol,
    transcript: hgvs.transcript,
    hgncId: hgvs.hgncId,
    isValidated: validated,
    count: 0,
    variantType: "HGVS"
  };
  return vdd;
}


export function displayIntergenic(ig: IntergenicHgvsVariant, validated: boolean): VariantDto {
  const igvar_dto: VariantDto = {
    variantString: ig.gHgvs,
    variantKey: ig.variantKey,
    transcript: '',
    hgncId: ig.hgncId || '',
    geneSymbol: ig.symbol || '',
    variantType: "INTERGENICHGVS",
    isValidated: validated,
    count: 0
  };
  return igvar_dto;
}

export function displaySv(sv: StructuralVariant, validated: boolean): VariantDto {
  const vdd: VariantDto = {
    variantString: sv.label,
    variantKey: sv.variantKey,
    geneSymbol: sv.geneSymbol,
    transcript: "TODO",
    hgncId: sv.hgncId,
    isValidated: validated,
    variantType: "SV",
    count: 0
  };
  return vdd;
}


/* This interface is needed to pass data to the GeneEditComponent. */
export interface GeneEditDialogData {
  alleleKey?: string;
  allelecount: number;
  gtData: GeneTranscriptData[];
  cohort: CohortData;
}
