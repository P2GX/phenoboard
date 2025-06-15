import { Injectable } from '@angular/core';


@Injectable({
    providedIn: 'root'
})
export class AgeInputService {
    readonly onsetTerms = ['Antenatal onset',
        'Embryonal onset', 'Fetal onset',
        'Late first trimester onset' , 'Second trimester onset' ,'Third trimester onset', 
        'Congenital onset',
        'Pediatric onset',
        'Neonatal onset', 'Infantile onset',  'Childhood onset',  'Juvenile onset' ,
        'Adult onset','Young adult onset',  'Early young adult onset' , 'Intermediate young adult onset' , 'Late young adult onset',
        'Middle age onset', 'Late onset' ];

    readonly isoPattern = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?$/;
    /** The user selects these terms for use in annotations */
    public selectedTerms: string[] = [];

    /**
     * Returns true if the input is a valid ISO8601 age string or a known HPO term
     */
    validateAgeInput(input: string): boolean {
        return this.onsetTerms.includes(input) || this.isoPattern.test(input);
    }


    setSelectedTerms(terms: string[]) {
        console.log("Set selected: ", terms);
        this.selectedTerms = terms;
    }

    addSelectedTerm(term: string) {
        this.selectedTerms.push(term);
    }

    clearSelectedTerms() {
        this.selectedTerms = [];
    }
}