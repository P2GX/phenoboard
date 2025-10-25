import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';


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
    readonly gestationalAgePattern = /^G\d{1,2}w(?:[0-6]d)?$/;
    /** The user selects these terms for use in annotations */
    public selectedTerms: string[] = ["na"];

    /**
     * Returns true if the input is a valid ISO8601 age string, a gestational age string, or a known HPO term ("na" is also an allowed entry)
     */
    validateAgeInput(input: string): boolean {
        return input == "na" || this.onsetTerms.includes(input) || this.isoPattern.test(input) || this.gestationalAgePattern.test(input);
    }

    /** Expose an Angular validator that uses the same logic */
    validator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            if (!value) return null; // don't mark empty as invalid, let required handle that
            return this.validateAgeInput(value) ? null : { invalid: true };
        };
    }

    /** always present "na" as the first value. These are the age terms that are selectable for the phenotypic features */
    addSelectedTerms(terms: string[]) {
        this.selectedTerms = Array.from(new Set([...this.selectedTerms, ...terms]));
    }

    addSelectedTerm(term: string) {
        this.selectedTerms = Array.from(new Set([...this.selectedTerms, term]));
    }

    removeSelectedTerm(term: string) {
        this.selectedTerms = this.selectedTerms.filter(t => t !== term);
    }

    removeSelectedTerms(terms: string[]) {
        const removeSet = new Set(terms);
        this.selectedTerms = this.selectedTerms.filter(t => !removeSet.has(t));
    }

    clearSelectedTerms() {
        this.selectedTerms = ["na"];
    }

    getSelectedTerms(): string[] {
        return this.selectedTerms;
    }
}