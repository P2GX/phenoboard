


export interface StructuralType {
    label: string;
    id: string;
} 

/**
 * Types of variants we may want to validate. HGVS is c./n. small variants, PreciseSv is a type
 * of structural variant with precise positions (not implemented yet), and the others are symbolic
 * structural variants such as DEL Ex 5-8
 */
export type VariantValidationType =
  | 'HGVS'
  | 'DEL'
  | 'INV'
  | 'TRANSL'
  | 'DUP'
  | 'SV'
  | 'PRECISE_SV';


/**
 * A Data Transfer Object for information about a Variant that we want to validate.
 */
export interface VariantValidationDto {
    variantString: string,
    transcript: string,
    hgncId: string,
    geneSymbol: string,
    validationType: VariantValidationType
}

export function createHgvsValidationDto(
    variantString: string,
    transcript: string,
    hgncId: string,
    geneSymbol: string,
): VariantValidationDto {
    return {
        variantString,
        transcript,
        hgncId,
        geneSymbol,
        validationType: 'HGVS'
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
  variantId: string;
}

/** 
 * The kind of structural variant being sent for validation.
 */
export type SvType =
  | 'DEL'       // chromosomal_deletion
  | 'INV'       // chromosomal_inversion
  | 'TRANSL'    // chromosomal_translocation
  | 'DUP'       // chromosomal_duplication
  | 'SV';       // structural_variation, not specific subtype


export interface StructuralVariant {
  label: string;
  geneSymbol: string;
  hgncId: string;
  svType: SvType;
  chromosome: string;
}


function variantKeyHgvs(v: HgvsVariant): string {
  return `${v.hgvs}_${v.symbol}_${v.transcript}`;
}

export function variantKeySv(sv: StructuralVariant): string {
  const cleanLabel = sv.label
    .split("")
    .map(c => /[a-zA-Z0-9]/.test(c) ? c : "_")
    .join("");
  return `${sv.geneSymbol}_${sv.svType}_${cleanLabel}`;
}


/**
 * Simple structure to combine some data about a variant we have validated or still need to 
 * validate. The information is mainly use to display the status of a variant in the GUI. Note
 * that the alleles inthe phenopacket use the vairantKey to extract the full information from 
 * one of the two variant maps (for HGVS and SV). We do not persist this DTO, it is designed merely
 * to simplify handling of data for display in the GUI.
 */
export interface VariantDisplayDto {
  variantString: string,
  variantKey: string,
  geneSymbol: string,
  transcript: string,
  hgncId: string,
  validated: boolean,
  isHgvs: boolean,
}


export function displayHgvs(hgvs: HgvsVariant, validated: boolean): VariantDisplayDto {
  const vdd: VariantDisplayDto = {
    variantString: hgvs.hgvs,
    variantKey: variantKeyHgvs(hgvs),
    geneSymbol: hgvs.symbol,
    transcript: hgvs.transcript,
    hgncId: hgvs.hgncId,
    validated: validated,
    isHgvs: true
  };
  return vdd;
}


export function displaySv(sv: StructuralVariant, validated: boolean): VariantDisplayDto {
  const vdd: VariantDisplayDto = {
    variantString: sv.label,
    variantKey: variantKeySv(sv),
    geneSymbol: sv.geneSymbol,
    transcript: "TODO",
    hgncId: sv.hgncId,
    validated: validated,
    isHgvs: false
  };
  return vdd;
}
