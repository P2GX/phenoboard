/*
 * The data transfer objects in this file correspond to analogous structs in ga4ghphenotools
*/

import { CellValue, HpoTermDuplet } from "./hpo_term_dto";
import { HgvsVariant, StructuralVariant } from "./variant_dto";

export interface IndividualData {
    pmid: string;
    title: string; 
    individualId: string;
    comment: string;
    ageOfOnset: string;
    ageAtLastEncounter: string;
    deceased: string;
    sex: string;
}



export interface GeneVariantData {
    hgncId: string;
    geneSymbol: string;
    transcript: string;
    allele1: string;
    allele2: string;
    variantComment: string;
}

export interface ModeOfInheritance {
  /** Human Phenotype Ontology identifier, e.g., HP:0000006 */
  hpoId: string;
  /** HPO term label, e.g., "Autosomal dominant inheritance" */
  hpoLabel: string;
  /** PMID or other CURIE citation supporting the assertion */
  citation: string;
}

export interface GeneTranscriptData {
    hgncId: string;
    geneSymbol: string;
    transcript: string;
}

export interface DiseaseData {
    diseaseId: string;
    diseaseLabel: string;
    modeOfInheritanceList: ModeOfInheritance[];
    geneTranscriptList: GeneTranscriptData[];
}



export interface RowData {
    individualData: IndividualData;
    diseaseIdList: string[];
    alleleCountMap: Record<string, number>;
    hpoData: CellValue[];
}


export interface CurationEvent {
  /** ORCID identifier of the curator */
  orcid: string;
  /** Date of curation in YYYY-MM-DD format */
  date: string;
}

export function createCurationEvent(orcid: string): CurationEvent {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;

  return {
    orcid,
    date
  };
}


export type CohortType = 'mendelian' | 'melded' | 'digenic';

export interface CohortData {
    cohortType: CohortType,
    diseaseList: DiseaseData[],
    hpoHeaders: HpoTermDuplet[],
    rows: RowData[],
    hgvsVariants: Record<string, HgvsVariant>;
    structuralVariants: Record<string, StructuralVariant>;
    phetoolsSchemaVersion: string;
    hpoVersion: string;
    cohortAcronym?: string | null;
    /** History of biocuration events in chronological order */
    curationHistory?: CurationEvent[];
}









/// This is used to transmit information about a new disease template
/// It can be used for Mendelian, Melded, Digenic

/// Mendelian: disease_dto_list and gene_variant_dto_list must both be of length 1
/// Melded: both of length two
/// Digenic: disease_dto of length 1, gene_variant_dto of length 2
/*
export interface DiseaseGeneData {
    diseaseDataList: DiseaseData[],
    /// Gene (or genes, for digenic/Melded) diagnosed in individuals of the cohort
    geneTranscriptDataList: GeneTranscriptData[],

}*/

export function newMendelianTemplate(
    diseaseId: string, 
    diseaseLabel: string, 
    hgnc: string, 
    symbol: string, 
    transcript: string): DiseaseData {
    const gvb_data: GeneVariantData = {
        hgncId: hgnc,
        geneSymbol: symbol,
        transcript: transcript,
        allele1: 'na',
        allele2: 'na',
        variantComment: 'na'
    }
    
    return {
        diseaseId: diseaseId,
        diseaseLabel: diseaseLabel,
        geneTranscriptList: [gvb_data],
        modeOfInheritanceList:[],
    };
}

export { CellValue };
