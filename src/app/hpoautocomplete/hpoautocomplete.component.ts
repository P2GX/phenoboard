import { Component, inject, input, output, viewChild, effect } from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { debounceTime, switchMap, of, map, startWith } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core'; 
import { CommonModule } from '@angular/common'; 
import { MatCardModule } from '@angular/material/card';
import { ConfigService } from '../services/config.service';
import { HpoMatch } from '../models/hpo_mapping_result';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from "@angular/material/icon";


/* the autocomplete form returns an HpoMatch object upon success. We check for this */
export function hpoMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    // If it's a string, it means the user typed but didn't click an option
    // If it's null/empty, let 'required' handle it (or ignore)
    if (typeof value === 'string' && value.length > 0) {
      return { 'invalidSelection': true };
    }
    return null;
  };
}


@Component({
  selector: 'app-hpoautocomplete',
  standalone: true,
  templateUrl: './hpoautocomplete.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatCardModule,
    MatIcon
]
})
export class HpoAutocompleteComponent {
  private configService = inject(ConfigService);
  
  placeholder = input<string>('Search HPO term...');
  inputString = input<string>('');

  selected = output<HpoMatch>();

  inputElement = viewChild<HTMLInputElement>('hpoInput');
  control = new FormControl<string | HpoMatch>('', [hpoMatchValidator()]);

  // A helper signal for the parent to check validity
  isValid = toSignal(this.control.statusChanges.pipe(map(status => status === 'VALID')), { initialValue: false });

  options = toSignal(
    this.control.valueChanges.pipe(
      startWith(this.control.value), // the start values ensures that changes trigger autocomplete!
      debounceTime(300),
      switchMap((value) =>{
        const query = typeof value ==='string' ? value : value?.label;
        if (query && query.length > 2) {
          return this.configService.getAutocompleteHpo(query);
        }
        return of([]);
      })
    ),
    { initialValue: [] as HpoMatch[]}
  );

  constructor() {
    effect(() => {
      const val = this.inputString();
      if (val) {
        this.control.setValue(val, {emitEvent: false});
        this.inputElement()?.select();
      }
    });
  }
  
  

  // turn an HpoMatch object into a string for the input box
  displayFn(option: HpoMatch | string | null): string {
    if (! option) return '';
    return typeof option === 'string' ? option  : option.label;
  }


  onOptionSelected(event: MatAutocompleteSelectedEvent) {
    const selection = event.option.value as HpoMatch;
    this.selected.emit(selection);
  }
  
  clear() {
    this.control.setValue('');
  }

 

 
  
}
