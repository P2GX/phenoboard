import { computed, Injectable, signal } from '@angular/core';
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
    /** *The source of truth for user-selected age strings.
     */
    public _selectedTerms = signal<string[]>(["na"]);
    /** Expose the signal as read-only for components */
    readonly selectedTerms = this._selectedTerms.asReadonly();
    /** for autocomplete lists */
    readonly allAvailableTerms = computed(() => {
        return Array.from(new Set([...this.onsetTerms, ...this._selectedTerms()]));
    });
    /**
     * Returns true if the input is a valid ISO8601 age string, a gestational age string, or a known HPO term ("na" is also an allowed entry)
     */
    validateAgeInput(input: string): boolean {
        return input == "na" ||
        this.onsetTerms.includes(input) || 
        this.isoPattern.test(input) || 
        this.gestationalAgePattern.test(input);
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
        this._selectedTerms.update(current => Array.from(new Set([...current, ...terms])));
    }

    addSelectedTerm(term: string) {
        this._selectedTerms.update(current => Array.from(new Set([...current, term])));
    }

    removeSelectedTerm(term: string) {
        this._selectedTerms.update(current => current.filter(t => t !== term));
    }

    removeSelectedTerms(terms: string[]) {
        const removeSet = new Set(terms);
        this._selectedTerms.update(current => current.filter(t => !removeSet.has(t)));
    }

    clearSelectedTerms() {
        this._selectedTerms.set(["na"]);
    }

}