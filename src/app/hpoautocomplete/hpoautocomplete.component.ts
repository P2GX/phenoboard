import { Component, OnInit, Input, SimpleChanges, Output, EventEmitter, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, switchMap, startWith, of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core'; 
import { CommonModule } from '@angular/common'; 
import { MatCardModule } from '@angular/material/card';
import { ConfigService } from '../services/config.service';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { HpoMatch } from '../models/hpo_mapping_result';


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
    MatCardModule
  ]
})
export class HpoAutocompleteComponent implements OnInit {


  public configService = inject(ConfigService);
  control = new FormControl<string | HpoMatch>('');
  @Input() initialValue = "";
  options: HpoMatch[] = [];
  textMiningSuccess: boolean = false;

  @Input() inputString: string = '';
  @Output() selected = new EventEmitter<HpoTermDuplet>();
  @Input() onSubmit: (term: HpoTermDuplet) => Promise<void> = async () => {};


  ngOnChanges(changes: SimpleChanges) {
    if (changes['inputString'] && changes['inputString'].currentValue !== undefined) {
      this.control.setValue(this.inputString);
    }
    if (this.inputString) {
      this.control.setValue(this.inputString, { emitEvent: false });
    }
    // visually highlight the text so the user can overwrite it immediately
    setTimeout(() => {
      const input = document.querySelector('input[matInput]') as HTMLInputElement;
      if (input) input.select();
    });
  }

  ngOnInit(): void {
    this.control.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap((value) => {
        if (typeof value === 'string' && value.length > 2) {
          this.textMiningSuccess = true;
          return this.configService.getAutocompleteHpo(value);
        }
        return of([]); 
      })
    ).subscribe((suggestions: HpoMatch[]) => {  
      this.options = suggestions;
    });
    if (this.initialValue && this.initialValue.length > 5) {
      this.control.setValue(this.initialValue);
    }
  }

  // turn an HpoMatch object into a string for the input box
  displayFn(option: HpoMatch | string): string {
    if (typeof option === 'string') return option;
    return option ? option.label : '';
  }

  clearInput() {
    this.control.reset();
    this.textMiningSuccess = false;
  }

  /* This function works with a callback from the parent component. 
    for instance, <app-hpoautocomplete (termSubmitted)="handleTermSubmit($event)"></app-hpoautocomplete>.
    The callback function will be activate, and then we clear the input. 
    We get something like "HP:0000828 - Abnormality of the parathyroid gland" and create an HpoTermDuplet*/
  async submitTerm() {
    const selection = this.control.value;
    if (selection && typeof selection !== 'string') {
      const duplet: HpoTermDuplet = {
        hpoId: selection.id,
        hpoLabel: selection.label
      };
      this.selected.emit(duplet);
      await this.onSubmit(duplet);
    } else {
      console.error("could not retrieve HPO autocompletion value");
    }
    this.clearInput();
  }


  
}
