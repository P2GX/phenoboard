import { Component, OnInit, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, switchMap, startWith, of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core'; // Needed for mat-option
import { CommonModule } from '@angular/common'; // Needed for *ngFor, etc.
import { MatCardModule } from '@angular/material/card';
import { ConfigService } from '../services/config.service';
import { EMPTY } from 'rxjs';



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
          console.log('Typed value:', value, 'Type:', typeof value);
        console.log('Typed value:', value);
        if (typeof value === 'string' && value.length > 2) {
          this.textMiningSuccess = true;
          return this.configService.getAutocompleteHpo(value);
        }
        return EMPTY; /*of([]);*/
      })
    ).subscribe((suggestions) => {  
      console.log('Suggestions:', suggestions);
      this.options = suggestions;
    });
  }

  clearInput() {
    this.control.reset();
    this.textMiningSuccess = false;
  }

  submitTerm() {
    console.log("hpo auto complete, submitTerm");
    const autocompletedTerm = this.control.value;
    if (autocompletedTerm) {
       console.log("hpo auto complete, submitTerm au=", autocompletedTerm);
      const [id, label] = autocompletedTerm.split('-').map(s => s.trim());
      this.configService.submitAutocompleteHpoTerm(id, label);
    }
    this.clearInput()
  }
}
