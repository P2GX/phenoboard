/*
 * The DTOs in this file correspond to DTOs in ga4ghphenotools, 
 * template_dto.rs. 
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


export interface DiseaseData {
    diseaseId: string;
    diseaseLabel: string;
}



export interface GeneVariantData {
    hgncId: string;
    geneSymbol: string;
    transcript: string;
    allele1: string;
    allele2: string;
    variantComment: string;
}



export interface RowData {
    individualData: IndividualData;
    diseaseDataList: DiseaseData[];
    alleleCountMap: Record<string, number>;
    hpoData: CellValue[];
}





export type CohortType = 'mendelian' | 'melded' | 'digenic';

export interface CohortData {
    cohortType: CohortType,
    diseaseGeneData: DiseaseGeneData,
    hpoHeaders: HpoTermDuplet[],
    rows: RowData[],
    hgvsVariants: Record<string, HgvsVariant>;
    structuralVariants: Record<string, StructuralVariant>;
    dtoVersion: string;
    cohortAcronym: string;
}




export interface GeneTranscriptDto {
    hgncId: string;
    geneSymbol: string;
    transcript: string;
}





/// This is used to transmit information about a new disease template
/// It can be used for Mendelian, Melded, Digenic

/// Mendelian: disease_dto_list and gene_variant_dto_list must both be of length 1
/// Melded: both of length two
/// Digenic: disease_dto of length 1, gene_variant_dto of length 2
export interface DiseaseGeneData {
    templateType: CohortType,
    /// Abbreviation of disease that is used in file name
    cohortAcronym: string,
    /// Disease (or diseases, for Melded) diagnosed in individuals of the cohort
    diseaseDtoList: DiseaseData[],
    /// Gene (or genes, for digenic/Melded) diagnosed in individuals of the cohort
    geneTranscriptDtoList: GeneTranscriptDto[],

}

export function newMendelianTemplate(
    diseaseId: string, 
    diseaseLabel: string, 
    cohortAcronym: string,
    hgnc: string, 
    symbol: string, 
    transcript: string): DiseaseGeneData {

    const disease_dto: DiseaseData = {
        diseaseId: diseaseId,
        diseaseLabel: diseaseLabel
    }
    
    const gvb_dto: GeneVariantData = {
        hgncId: hgnc,
        geneSymbol: symbol,
        transcript: transcript,
        allele1: 'na',
        allele2: 'na',
        variantComment: 'na'
    }
    
    return {
        templateType: 'mendelian',
        cohortAcronym: cohortAcronym,
        diseaseDtoList: [disease_dto],
        geneTranscriptDtoList: [gvb_dto],
    };
}

export { CellValue };
