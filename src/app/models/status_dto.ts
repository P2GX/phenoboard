export interface StatusDto {
    hpoLoaded: boolean;
    hpoVersion: string;
    nHpoTerms: number;
    ptTemplatePath: string;
    ptTemplateLoaded: boolean;
    cohortName: string;
    nPhenopackets: number;
    newCohort: boolean;
    unsavedChanges: boolean;
    hasError: boolean;
    errorMessage: string;
}

export function defaultStatusDto(): StatusDto {
    return {
        hpoLoaded: false,
        hpoVersion: '',
        nHpoTerms: 0,
        ptTemplatePath: '',
        ptTemplateLoaded: false,
        cohortName: '',
        nPhenopackets: 0,
        newCohort: false,
        unsavedChanges: false,
        hasError: false,
        errorMessage: ''
    };
}
