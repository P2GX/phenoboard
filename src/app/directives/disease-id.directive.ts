import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appDiseaseIdSanitizer]',
  standalone: true
})
export class DiseaseIdSanitizerDirective {
  constructor(private ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const trimmedValue = input.value.replace(/\s+/g, ''); // remove all whitespace

    if (trimmedValue !== input.value) {
      input.value = trimmedValue;
      if (this.ngControl && this.ngControl.control) {
        this.ngControl.control.setValue(trimmedValue, { emitEvent: false });
      }
    }
  }
  
}
