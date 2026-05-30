import { Component, inject, OnInit, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HpoModifierService } from '../../services/hpo_modifier_service';
import { HpoTermDuplet } from '../../models/hpo_term_dto';

@Component({
  selector: 'app-hpo-modifier-menu',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './hpo-modifier-menu.html',
  styleUrls: ['./hpo-modifier-menu.scss']
})
export class HpoModifierMenuComponent implements OnInit {
  private modifierService = inject(HpoModifierService);

  cellData = input.required<any>();
  modifierSelected = output<string>();

  control = new FormControl<string|HpoTermDuplet|null>('');
  placeholder = signal('Search modifiers...');
  options = signal<HpoTermDuplet[]>([]);
  
  quickModifiers = ['Mild', 'Moderate', 'Severe'];

  async ngOnInit() {
    await this.modifierService.ensureModifiersLoaded();
    this.options.set(this.modifierService.filterLocalTerms(''));

    this.control.valueChanges.subscribe(value => {
        const query = typeof value === 'string' ? value : value?.hpoLabel ?? '';
        const filtered = this.modifierService.filterLocalTerms(query);
        this.options.set(filtered);
        });
  }

  selectQuickModifier(mod: string) {
    // Mild  HP:0012825
    // Moderate  HP:0012826
    // Severe HP:0012828
    if (mod === "Mild") {
        mod = "HP:0012825";
    } else if (mod === "Moderate") {
        mod = "HP:0012826";
    } else if (mod === "Severe") {
        mod = "HP:0012828";
    }
    this.modifierSelected.emit(mod);
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent) {
    const selectedOption = event.option.value as HpoTermDuplet;
    this.modifierSelected.emit(selectedOption.hpoId);
    this.clear();
  }

  displayFn(option: HpoTermDuplet | null): string {
    return option ? option.hpoLabel : '';
  }

  clear() {
    this.control.setValue('');
  }
}