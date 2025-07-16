

import { DiseaseDto } from "./template_dto";

/**
 * DTO that specified a Gene with its HGNC and transcript. This is intended to be used when we create a new row.
 */
export interface GeneTranscriptDto {
    hgncId: string,
    geneSymbol: string,
    transcript: string,
}



export type CohortType = 'mendelian' | 'melded' | 'digenic';


/// This is used to transmit information about a new disease template
/// It can be used for Mendelian, Melded, Digenic

/// Mendelian: disease_dto_list and gene_variant_dto_list must both be of length 1
/// Melded: both of length two
/// Digenic: disease_dto of length 1, gene_variant_dto of length 2
export interface DiseaseGeneDto {
    templateType: CohortType,
    diseaseDtoList: DiseaseDto[],
    geneVariantDtoList: GeneTranscriptDto[],
}

export function newMendelianTemplate(
    diseaseId: string, 
    diseaseLabel: string, 
    hgnc: string, 
    symbol: string, 
    transcript: string): DiseaseGeneDto {

    const disease_dto: DiseaseDto = {
        diseaseId: diseaseId,
        diseaseLabel: diseaseLabel
    }
    
    const gvb_dto: GeneTranscriptDto = {
        hgncId: hgnc,
        geneSymbol: symbol,
        transcript: transcript,
    }
    
    return {
        templateType: 'mendelian',
        diseaseDtoList: [disease_dto],
        geneVariantDtoList: [gvb_dto],
    };
}
