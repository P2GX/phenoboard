import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appTrim]',
  standalone: true,
})
export class TrimDirective {
  constructor(
    private ngControl: NgControl,
  ) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const trimmedValue = input.value.trim(); 

    if (trimmedValue !== input.value) {
      input.value = trimmedValue;
      if (this.ngControl && this.ngControl.control) {
        this.ngControl.control.setValue(trimmedValue, { emitEvent: false });
      }
    }
  }
}
