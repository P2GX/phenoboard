

export interface IndividualDto {
    pmid: string;
    title: string; 
    individualId: string;
    comment: string;
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

export interface DemographicDto {
    ageOfOnset: string;
    ageAtLastEncounter: string;
    deceased: string;
    sex: string;
}

export interface CellDto {
    value: string;
}

export interface RowDto {
    individualDto: IndividualDto;
    diseaseDtoList: DiseaseDto[];
    geneVarDtoList: GeneVariantBundleDto[];
    demographicDto: DemographicDto,
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