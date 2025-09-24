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

export function asciiValidator() {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) return null;
    return /^[\x00-\x7F]*$/.test(value) ? null : { asciiOnly: true };
  };
}


/** Trim whitespace from beginning and end and remove non-ASCII characters */
export function sanitizeString(input: string): string {
    return input
    .trim()
    .replace(/[^\x00-\x7F]/g, ""); 
}