export interface DemographDto { 
    individualId: string;
    comment: string;
    ageOfOnset: string;
    ageAtLastEncounter: string;
    deceased: string;
    sex: string;
}

export function defaultDemographDto(): DemographDto {
    return {
        individualId: '',
        comment: '',
        ageOfOnset: 'na',
        ageAtLastEncounter: 'na',
        deceased: 'na',
        sex: 'U',
    };
}
