import { Injectable } from '@angular/core';


@Injectable({
    providedIn: 'root'
})
export class AgeInputService {
    readonly onsetTerms = ['na', 'Antenatal onset',
        'Embryonal onset', 'Fetal onset',
        'Late first trimester onset' , 'Second trimester onset' ,'Third trimester onset', 
        'Congenital onset',
        'Pediatric onset',
        'Neonatal onset', 'Infantile onset',  'Childhood onset',  'Juvenile onset' ,
        'Adult onset','Young adult onset',  'Early young adult onset' , 'Intermediate young adult onset' , 'Late young adult onset',
        'Middle age onset', 'Late onset' ];

    readonly isoPattern = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?$/;
    /** The user selects these terms for use in annotations */
    public selectedTerms: string[] = ["na"];

    /**
     * Returns true if the input is a valid ISO8601 age string or a known HPO term
     */
    validateAgeInput(input: string): boolean {
        return this.onsetTerms.includes(input) || this.isoPattern.test(input);
    }

    /** always present "na" as the first value. These are the age terms that are selectable for the phenotypic features */
    setSelectedTerms(terms: string[]) {
        this.selectedTerms = [...terms];
    }

    addSelectedTerm(term: string) {
        this.selectedTerms.push(term);
    }

    clearSelectedTerms() {
        this.selectedTerms = [];
    }

    getSelectedTerms(): string[] {
        return this.selectedTerms;
    }
}