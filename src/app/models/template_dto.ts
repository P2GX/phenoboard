

export interface IndividualDto {
    pmid: string;
    title: string; 
    individualId: string;
    comment: string;
}

export interface CellDto {
    value: string;
}

export interface RowDto {
    individualDto: IndividualDto;
    data: CellDto[];
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
    header: HeaderDto;
    rows: RowDto[];
}