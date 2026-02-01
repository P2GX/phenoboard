import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgeInputService } from '../services/age_service';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from "@angular/material/autocomplete";

@Component({
  selector: 'app-addages',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatAutocompleteModule],
  templateUrl: './addage.component.html',
  styleUrl: './addage.component.css'
})
export class AddageComponent {
  private ageService = inject(AgeInputService);
  private dialogRef = inject(MatDialogRef<AddageComponent>);
  readonly existingAgeStrings = this.ageService.selectedTerms;
  customAge = signal('');

  readonly existingTerms = this.ageService.allAvailableTerms;
  filteredTerms = computed(() => {
    const typed = this.customAge().toLowerCase();
    if (!typed) return this.existingTerms();
    return this.existingTerms().filter(t => t.toLowerCase().includes(typed));
  });

  ageInput = signal('');

  /* User chooses an existing string from the list */
  selectExisting(term: string): void {
    if (term) {
      this.dialogRef.close(term);
    }
  }

  /**
   * User creates a new age string
   */
  createNewAge(): void {
    const val = this.customAge().trim();
    if (!val) return;
    if (this.ageService.validateAgeInput(val)) {
      // Side effect: Add to the service pool for future use
      this.ageService.addSelectedTerm(val);
      // Close and return the new string
      this.dialogRef.close(val);
    } else {
      alert('Invalid format. Please use ISO8601 (e.g. P1Y) or Gestational (e.g. G20w).');
    }
  }



  onCancel(): void {
    this.dialogRef.close();
  }

}
