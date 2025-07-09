

export interface IndividualDto {
    pmid: string;
    title: string; 
    individualId: string;
    comment: string;
    ageOfOnset: string;
    ageAtLastEncounter: string;
    deceased: string;
    sex: string;
}

export interface DiseaseDto {
    diseaseId: string;
    diseaseLabel: string;
}

export interface GeneVariantBundleDto {
    hgncId: string;
    geneSymbol: string;
    transcript: string;
    allele1: string;
    allele2: string;
    variantComment: string;
}


export interface CellDto {
    value: string;
}

export interface RowDto {
    individualDto: IndividualDto;
    diseaseDtoList: DiseaseDto[];
    geneVarDtoList: GeneVariantBundleDto[];
    hpoData: CellDto[];
}

export interface HeaderDupletDto {
    h1: string;
    h2: string;
}

export interface HeaderDto {
    individualHeader: HeaderDupletDto[];
    data: HeaderDupletDto[];
}

export interface TemplateDto {
    cohortType: string;
    hpoHeaders: HeaderDupletDto[];
    rows: RowDto[];
}


/// This is used to transmit information about a new disease template
/// It can be used for Mendelian, Melded, Digenic
/// seed_text can have text with phenotypic descriptions from which we will generate 
/// appropriate columns for the template by text mining
/// Mendelian: disease_dto_list and gene_variant_dto_list must both be of length 1
/// Melded: both of length two
/// Digenic: disease_dto of length 1, gene_variant_dto of length 2
export interface NewTemplateDto {
    templateType: string,
    diseaseDtoList: DiseaseDto[],
    geneVariantDtoList: GeneVariantBundleDto[],
    seedText: string
}

export function newMendelianTemplate(
    diseaseId: string, 
    diseaseLabel: string, 
    hgnc: string, 
    symbol: string, 
    transcript: string, 
    seedText:string): NewTemplateDto {

    const disease_dto: DiseaseDto = {
        diseaseId: diseaseId,
        diseaseLabel: diseaseLabel
    }
    
    const gvb_dto: GeneVariantBundleDto = {
        hgncId: hgnc,
        geneSymbol: symbol,
        transcript: transcript,
        allele1: 'na',
        allele2: 'na',
        variantComment: 'na'
    }
    
    return {
        templateType: 'mendelian',
        diseaseDtoList: [disease_dto],
        geneVariantDtoList: [gvb_dto],
        seedText: seedText
    };
}