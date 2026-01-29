import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from "@angular/material/checkbox";
import { HpoAutocompleteComponent } from "../hpoautocomplete/hpoautocomplete.component";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { HpoMatch, MiningConcept, MiningStatus } from '../models/hpo_mapping_result';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { SplitDialogComponent } from './splitdialog.component';
import { firstValueFrom } from 'rxjs';


/// symbols for not applicable or unknown status
const NOT_APPLICABLE = new Set(["na",  "n.a.", "n/a", "nd",  "n/d", "n.d.", "?", "/", "n.d.",  "unknown"]);



/* Component to map columns that contain strings representing one to many HPO terms */
@Component({
  selector: 'app-multihpo',
  standalone: true,
  templateUrl: './multihpo.component.html',
  styleUrls: ['./multihpo.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    CommonModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    HpoAutocompleteComponent
]
})
export class MultiHpoComponent {
  readonly concepts = signal<MiningConcept[]>([]);
  
  private configService = inject(ConfigService);
  // Track which row indices are currently showing the search input field
  searchingIndices = new Set<number>();
  private dialogRef = inject(MatDialogRef<MultiHpoComponent>);
  private dialog = inject(MatDialog);
  public data = inject(MAT_DIALOG_DATA) as { concepts: MiningConcept[], title: string };
  title: string = this.data.title;
  constructor() {
    const processed = (this.data.concepts ?? [])
      .filter(c => {
        const text = c.originalText.toLowerCase().trim();
        return !NOT_APPLICABLE.has(text) && /[a-zA-Z]/.test(text);
      })
      .map(c => ({
        ...c,
        // Auto-confirm if terms exist
        miningStatus: c.suggestedTerms.length > 0 ? MiningStatus.Confirmed : c.miningStatus
      }));

    this.concepts.set(processed);
        console.log("MultiHpoComponent CTOR")

  }

  

 // Update a specific concept when user uses autocomplete
updateMapping(index: number, newTerm: HpoTermDuplet) {
  this.concepts.update(list => {
    const cloned = [...list];
    const concept = cloned[index];

    // Push the new term into the suggestedTerms array
    concept.suggestedTerms.push({
      id: newTerm.hpoId,
      label: newTerm.hpoLabel,
      matchedText: concept.originalText
    });

    concept.miningStatus = MiningStatus.Confirmed;
    return cloned;
  });
}

toggleConfirm(index: number) {
  this.concepts.update(list => {
    const cloned = [...list];
    const c = cloned[index];
    
    c.miningStatus = c.miningStatus === MiningStatus.Confirmed 
      ? MiningStatus.Pending 
      : MiningStatus.Confirmed;
      
    return cloned;
  });
}

removeConcept(index: number) {
  this.concepts.update(list => {
    const cloned = [...list];
    cloned.splice(index, 1);
    return cloned;
  });
}

  cancel() {
    this.dialogRef.close();
  }

  save() {
    // Return the refined list of concepts back to processMultipleHpoColumn
    this.dialogRef.close(this.concepts());
  }

 resetMapping(index: number) {
    this.concepts.update(list => {
      const cloned = [...list];
      cloned[index] = {
        ...cloned[index],
        miningStatus: MiningStatus.Pending,
        suggestedTerms: []
      };
      return cloned;
    });
  }

  prepareConcepts() {
    const processed = this.data.concepts.map(c => ({
      ...c,
      // Note: If you added 'isSearching' to your interface, 
      // it helps track local UI state for the search box
      isSearching: false,
      suggestedTerms: Array.isArray(c.suggestedTerms) ? [...c.suggestedTerms] : []
    }));
    
    // Use .set() for a full replacement
    this.concepts.set(processed);
  }

  addNewTerm(conceptIndex: number, newTerm: HpoTermDuplet) {
    const concept: MiningConcept = this.concepts()[conceptIndex];
    
    const newMatch: HpoMatch = {
      id: newTerm.hpoId,
      label: newTerm.hpoLabel,
      matchedText: concept.originalText
    };

    // Prevent duplicates
    if (!concept.suggestedTerms.some(t => t.id === newMatch.id)) {
      concept.suggestedTerms.push(newMatch);
    }
    
    concept.miningStatus = MiningStatus.Confirmed;
    this.searchingIndices.delete(conceptIndex);
  }

  removeTerm(conceptIndex: number, termIndex: number) {
    this.concepts.update(list => {
      const cloned = [...list];
      const concept = { 
        ...cloned[conceptIndex], 
        suggestedTerms: [...cloned[conceptIndex].suggestedTerms] 
      };
      concept.suggestedTerms.splice(termIndex, 1);
      if (concept.suggestedTerms.length === 0) {
        concept.miningStatus = MiningStatus.Pending;
      }
      cloned[conceptIndex] = concept;
      return cloned;
    });
  }

  onBlur(index: number) {
    // Only collapse if we have terms; otherwise keep search open
    if (this.concepts()[index].suggestedTerms.length > 0) {
      this.searchingIndices.delete(index);
    }
  }

  startSearch(index: number) {
    this.searchingIndices.add(index);
  }

  private executeSplit(index: number, delimiter: string): void {
    const currentList = this.concepts();
    const concept = currentList[index];

    const parts = concept.originalText.split(delimiter)
      .map(s => s.trim())
      .filter(s => s.length > 0); // Allow short strings, filter empty

    if (parts.length > 1) {
      // 1. Create a typed map of what we already know to auto-fill the new rows
      const knowledgeMap = new Map<string, HpoMatch[]>(
        currentList.map(c => [c.originalText.toLowerCase(), c.suggestedTerms])
      );
     
      // 2. Generate the new row objects
      const newConcepts: MiningConcept[] = parts.map(p => {
        const alreadyKnownTerms = knowledgeMap.get(p.toLowerCase()) || [];
        
        return {
          ...concept,  
          originalText: p,
          suggestedTerms: [...alreadyKnownTerms], 
          miningStatus: alreadyKnownTerms.length > 0 ? MiningStatus.Confirmed : MiningStatus.Pending,
          onsetString: null       
        };
      });

      // 3. Update the Signal
      this.concepts.update(old => {
        const cloned = [...old];
        cloned.splice(index, 1, ...newConcepts);
        return cloned;
      });
    }
  }

  async openSplitDialog(index: number) {
    const concept = this.concepts()[index];
    
    const dialogRef = this.dialog.open(SplitDialogComponent, {
      width: '400px',
      data: { text: concept.originalText }
    });

    // Wait for the delimiter (e.g., ",", ".", or a custom string)
    const resultDelimiter = await firstValueFrom(dialogRef.afterClosed());
    
    if (resultDelimiter) {
      this.executeSplit(index, resultDelimiter);
    }
  }

}