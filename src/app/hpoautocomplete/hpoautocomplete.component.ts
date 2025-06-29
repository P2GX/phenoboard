import { Component, OnInit, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, switchMap, startWith, of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core'; 
import { CommonModule } from '@angular/common'; 
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
  @Input() onSubmit: (term: string) => Promise<void> = async () => {};


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

  /* This function works with a callback from the parent component. 
    for instance, <app-hpoautocomplete (termSubmitted)="handleTermSubmit($event)"></app-hpoautocomplete>.
    The callback function will be activate, and then we clear the input. */
  async submitTerm() {
    const term = this.control.value;
    if (term) {
      this.selected.emit(term);
      await this.onSubmit(term);
    } else {
      console.error("could not retrieve HPO autocompletion value");
    }
    this.clearInput();
  }


  
}
