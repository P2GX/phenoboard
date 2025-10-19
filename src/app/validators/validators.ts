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


/** Trim whitespace from beginning and end, replace emdash/endash with normal dash, 
 * normalize non-standard whitespace, collapse repeated continguous whitespace characters,
 * and remove non-ASCII characters */
export function sanitizeString(input: string): string {
    return input
        .trim()
        // Normalize Unicode dashes and similar punctuation to "-"
        .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
        // Normalize various Unicode spaces to a regular space
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
        // Collapse multiple spaces
        .replace(/\s+/g, " ")
        // Remove control and other non-ASCII characters (optional)
        .replace(/[^\x20-\x7E]/g, "");
}