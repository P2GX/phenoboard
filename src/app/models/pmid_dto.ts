export interface PmidDto {
    pmid: string,
    title: string,
    hasError: boolean,
    retrievedPmid: boolean,
    errorMessage: string
}

export function defaultPmidDto(): PmidDto {
    return {
        pmid: '',
        title: '',
        hasError: false,
        retrievedPmid: false,
        errorMessage: '',
    };
}
