import { computed, Injectable, signal } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';


// regexes for human strings such as 4y2m and 4yrs 2nth
const RE_YEAR = /(\d+(?:\.\d+)?)\s*y/i;
const RE_MONTH = /(\d+(?:\.\d+)?)\s*m/i;
const RE_WEEK = /(\d+(?:\.\d+)?)\s*w/i;
const RE_DAY = /(\d+)\s*d/i;
// Matches ISO 8601 durations like "P1Y6M3D" or "P0D"
const ISO8601_RE = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?$/i;
const GESTATIONAL_AGE_RE = /^G(\d+)w(?:([0-6])d)?$/i;


@Injectable({
    providedIn: 'root'
})
export class AgeInputService {
    readonly ALLOWED_AGE_LABELS = new Set(['na', 'Antenatal onset',
        'Embryonal onset', 'Fetal onset',
        'Late first trimester onset' , 'Second trimester onset' ,'Third trimester onset', 
        'Congenital onset',
        'Pediatric onset',
        'Neonatal onset', 'Infantile onset',  'Childhood onset',  'Juvenile onset' ,
        'Adult onset','Young adult onset',  'Early young adult onset' , 'Intermediate young adult onset' , 'Late young adult onset',
        'Middle age onset', 'Late onset' ]);

    readonly AGE_TERM_MAP: Record<string, string> = {
        antenatal: "Antenatal onset",
        neonate: "Neonatal onset",
        neonatal: "Neonatal onset",
        birth: "Congenital onset",
        congenital: "Congenital onset",
        childhood: "Childhood onset",
        adult: "Adult onset",
        unk: "na",
        na: "na",
    };

  

     

    readonly isoPattern = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?$/;
    readonly gestationalAgePattern = /^G\d{1,2}w(?:[0-6]d)?$/;
    /** *The source of truth for user-selected age strings.
     */
    public _selectedTerms = signal<string[]>(["na"]);
    /** Expose the signal as read-only for components */
    readonly selectedTerms = this._selectedTerms.asReadonly();
    /** for autocomplete lists */
    readonly allAvailableTerms = computed(() => {
        return Array.from(new Set([...this.ALLOWED_AGE_LABELS, ...this._selectedTerms()]));
    });
    /**
     * Returns true if the input is a valid ISO8601 age string, a gestational age string, or a known HPO term ("na" is also an allowed entry)
     */
    validateAgeInput(input: string): boolean {
        return input == "na" ||
        this.ALLOWED_AGE_LABELS.has(input) || 
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

    mapAgeStringToSymbolic(input: string): string | null {
        const lower = input.toLowerCase();
        if (this.AGE_TERM_MAP[lower]) return this.AGE_TERM_MAP[lower];
        if (this.ALLOWED_AGE_LABELS.has(input)) return input;
        return null;
    }

    mapYmdToIso(input: string): string | undefined {
        const yMatch = RE_YEAR.exec(input);
        const mMatch = RE_MONTH.exec(input);
        const wMatch = RE_WEEK.exec(input);
        const dMatch = RE_DAY.exec(input);

        const yVal = yMatch ? parseFloat(yMatch[1]) : 0;
        const mVal = mMatch ? parseFloat(mMatch[1]) : 0;
        const wVal = wMatch ? parseFloat(wMatch[1]) : 0;
        const dVal = dMatch ? parseFloat(dMatch[1]) : 0;

        console.log(`input=${input} y=${yVal} m=${mVal} w=${wVal} d=${dVal}`);

        if (yVal === 0 && mVal === 0 && wVal === 0 && dVal === 0) return undefined;

        const years = Math.floor(yVal);
        const monthsFromY = Math.round((yVal - years) * 12);
        const totalMonths = Math.floor(mVal) + monthsFromY;

        const daysFromW = Math.round(wVal * 7);
        const totalDays = Math.floor(dVal) + daysFromW;

        let res = "P";
        if (years > 0) res += `${years}Y`;
        if (totalMonths > 0) res += `${totalMonths}M`;
        if (totalDays > 0) res += `${totalDays}D`;

        return res === "P" ? undefined : res;
    }

    mapEtlAgeString(input: string | null | undefined): string | undefined {
        if (! input) return undefined;
        const symbolic = this.mapAgeStringToSymbolic(input);
        if (symbolic) return symbolic;
        if (GESTATIONAL_AGE_RE.test(input)) return input;
        if (ISO8601_RE.test(input)) return input;
        return this.mapYmdToIso(input);
    }

}