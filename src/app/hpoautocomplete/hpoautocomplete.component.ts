import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, switchMap, startWith, of } from 'rxjs';
import { invoke } from '@tauri-apps/api/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core'; // Needed for mat-option
import { CommonModule } from '@angular/common'; // Needed for *ngFor, etc.
import { MatCardModule } from '@angular/material/card';
import { ConfigService } from '../services/config.service';


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


  constructor(public configService: ConfigService) {}
  control = new FormControl('');
  options: string[] = [];
  textMiningSuccess: boolean = false;

  @Input() inputString: string = '';
  @Output() selected = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['inputString'] && changes['inputString'].currentValue !== undefined) {
      this.control.setValue(this.inputString);
    }
  }

  ngOnInit(): void {
    this.control.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap((value) => {
        console.log('Typed value:', value);
        if (typeof value === 'string' && value.length > 3) {
          return this.configService.getAutocompleteHpo(value);
          this.textMiningSuccess = true;
        }
        return of([]);
      })
    ).subscribe((suggestions) => {  
      this.options = suggestions;
    });

    // 2. Detect valid HPO term selection and send it to backend
    /*
    this.control.valueChanges.subscribe(value => {
      if (typeof value === 'string' && this.options.includes(value)) {
        const match = value.match(/^(HP:\d{7})/);
        if (match) {
          const hpoId = match[1];
          invoke('set_autocompleted_hpo_term', { hpoTerm: hpoId })
            .then(() => console.log('Autocompleted HPO term sent:', hpoId))
            .catch(console.error);
          this.selected.emit(value); 
        }
        invoke('set_autocompleted_hpo_term', { hpoTerm: value })
          .then(() => console.log('Selected HPO term sent:', value))
          .catch(console.error);
      }
    });*/
  }

  clearInput() {
    this.control.reset();
    this.textMiningSuccess = false;
  }

  submitTerm() {
    const autocompletedTerm = this.control.value;
    if (autocompletedTerm) {
      const [id, label] = autocompletedTerm.split('-').map(s => s.trim());
    this.configService.submitAutocompleteHpoTerm(id, label);
    }
    this.clearInput()
  }
}
