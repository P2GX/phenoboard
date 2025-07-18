import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";





export function noLeadingTrailingSpacesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (typeof value === 'string') {
        if (value !== value.trim()) {
            return { whitespace: 'Leading or trailing whitespace is not allowed' };
        }
        }
        return null;
    };
}

export function noWhitespaceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (typeof value === 'string' && /\s/.test(value)) {
        return { whitespace: 'Whitespace is not allowed' };
        }
        return null;
    };
}