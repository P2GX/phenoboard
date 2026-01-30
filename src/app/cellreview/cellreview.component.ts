import { MAT_DIALOG_DATA, MatDialogRef, MatDialogActions, MatDialog, MatDialogContent } from "@angular/material/dialog";
import { ClinicalStatus, MinedCell, MiningConcept, MiningStatus } from "../models/hpo_mapping_result";
import { Component, computed, EventEmitter, Output, signal } from "@angular/core";
import { MatButtonToggle, MatButtonToggleGroup } from "@angular/material/button-toggle";
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from "@angular/material/icon";
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms'; // 1. Import from @angular/forms
import { AddagesComponent } from '../addages/addages.component'; // Adjust path as needed
import { inject } from '@angular/core';
import { single } from "rxjs";
import { MinedCellEditorComponent } from "./mined-cell-editor.component";




/* This component cycles thought each row (for a column) and allows the user to confirm/edit the HPO mapping. The input consists
in the strings from the original column and a list of MiningConcept objects, each of which has an arraw of row indices that show
which rows correspond to the concepts. The point of this widget is to review the mappings and add onsets if possible. The user can also delete mappings. */
@Component({
  selector: 'app-cell-review',
  standalone: true,
  imports: [FormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogContent,
    MatIcon,
    MatIconModule,
    MatMenuModule,
    MatTableModule, MinedCellEditorComponent],
  templateUrl: './cellreview.component.html',
  styleUrls: ['./cellreview.component.scss']
})
export class CellReviewComponent {
 
  public data = inject(MAT_DIALOG_DATA) as { 
    minedCells: MinedCell[],
    title: string 
  };

  @Output() update = new EventEmitter<MinedCell>();
 
  public dialogRef = inject(MatDialogRef<CellReviewComponent>);
  currentIndex = signal(0);
  allMinedCells = signal<MinedCell[]>(this.data.minedCells);
  readonly currentCell = computed(() => {
    return this.allMinedCells()[this.currentIndex()];
  });

  next(): void {
    if (this.currentIndex() < this.allMinedCells().length- 1) {
      this.currentIndex.update(i => i+1);
    } else {
      this.dialogRef.close(this.allMinedCells());
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i-1);
    }
  }

  handleCellChange(updatedCell: MinedCell) {
    this.allMinedCells.update(cells =>
      cells.map((c, idx) => idx === this.currentIndex() ? updatedCell : c)
    );
  }



  
/*
  readonly conceptsForThisCell = computed(() => {
    const currentIndex = this.currentIndex();
    const currentCell = this.allMinedCells()[currentIndex];
    if (!currentCell) return [];
    
    // Filter the signal value - get concepts that belong to the current window
    return currentCell.hpo_duplet_list
  });
  currentIndex = signal(0);
  readonly globalAgeEntries = computed(() => this.ageService.getSelectedTerms());


  next(): void {
    if (this.currentIndex() < this.allCells.length - 1) {
      this.currentIndex.update(i => i+1);
    } else {
      this.dialogRef.close(this.allMiningResults());
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
        this.currentIndex.update(i => i-1); 
    }
}


toggleAgeForConcept(concept: MiningConcept, age: string): void {
  const currentRowIndex = this.allCells[this.currentIndex()].rowIndex;
  this.allMiningResults.update(currentList => 
    currentList.map(item => {
      // Check if this is the object we want to update
      if (item.rowIndex === currentRowIndex && item === concept) {
        return { 
          ...item, 
          // If the string matches the age, clear it; otherwise set it
          onsetString: item.onsetString === age ? null : age 
        };
      }
      return item;
    })
  );
}

// set the age of onset of the marked row
openAgePicker(concept: MiningConcept): void {
  const existing = concept.onsetString ? concept.onsetString.split(';') : [];
  const dialogRef = this.dialog.open(AddagesComponent, {
    width: '450px',
    data: { existingAges: existing }
  });

  dialogRef.afterClosed().subscribe((result: string[] | undefined) => {
      if (result) {
        const newAgeString = result.join(';');
        this.allMiningResults.update(currentList => 
          currentList.map(item => item === concept ?
             { ...item, onsetString: newAgeString}: item));
      }
    });
  }

  // 1. Get every unique concept text in the entire dataset
  readonly allUniqueConcepts = computed(() => {
    const results = this.allMiningResults();
    const unique = new Map<string, MiningConcept>();
    results.forEach(c => {
      // ignore manually created Exclude rows
      if (c.miningStatus === MiningStatus.Confirmed || c.suggestedTerms.length>0){
        if (!unique.has(c.originalText)) {
          unique.set(c.originalText, {
            ...c,
            rowIndexList: [...c.rowIndexList],
            onsetString: null
          });
        } else {
          const existing = unique.get(c.originalText)!;
          const mergedRowIndices = Array.from(new Set([...existing.rowIndexList,...c.rowIndexList]));
          existing.rowIndexList = mergedRowIndices;
        }
      }
    });
    return Array.from(unique.values());
  });

  // 2. Identify which terms are NOT in the current cell
  readonly absentConcepts = computed(() => {
    const currentCellText = this.allCells[this.currentIndex()].original;
    return this.allUniqueConcepts().filter(concept => 
      !currentCellText.includes(concept.originalText)
    );
  });

  // 3. Method to set all absent terms to 'excluded' at once
  excludeAllAbsent(): void {
    const currentIndex = this.currentIndex();
    const currentRowIndex = this.allCells[currentIndex].rowIndex;
    const absentTerms = this.absentConcepts();
    this.allMiningResults.update(results => {
      let updatedResults = [...results];
      for (const term of absentTerms) {
        const existingIdx = updatedResults.findIndex(r =>
          r.rowIndex === currentRowIndex && r.originalText === term.originalText
        );
        if (existingIdx > -1) {
          updatedResults[existingIdx] = {
            ...updatedResults[existingIdx],
            clinicalStatus: ClinicalStatus.Excluded
          };
        } else {
          updatedResults.push({
            ...term,
            rowIndex: currentRowIndex,
            clinicalStatus: ClinicalStatus.Excluded,
            onsetString: null
          });
        }
      }
      return updatedResults;
    });
  }

  handleToggle(concept: MiningConcept): void {
  const currentRowIndex = this.allCells[this.currentIndex()].rowIndex;
  const targetText = concept.originalText;

  this.allMiningResults.update(results => {
    const existingIndex = results.findIndex(item =>
      item.rowIndex === currentRowIndex && item.originalText === targetText
    );

    if (existingIndex > -1) {
      // If it exists in this cell, remove it
      return results.filter((_, idx) => idx !== existingIndex);
    } else {
      // If it doesn't exist, add it as a new exclusion for THIS row only
      const newExclusion: MiningConcept = {
        ...concept, // This ensures originalText is copied!
        rowIndex: currentRowIndex,
        clinicalStatus: ClinicalStatus.Excluded,
        onsetString: null
      };
      return [...results, newExclusion];
    }
  });
}
  setClinicalStatus(concept: MiningConcept, status: ClinicalStatus) {
    const currentRowIndex = this.allCells[this.currentIndex()].rowIndex;

    this.allMiningResults.update(results =>
      results.map(r =>
        r.rowIndex === currentRowIndex &&
        r.originalText === concept.originalText
          ? { ...r, clinicalStatus: status }
          : r
      )
    );
  }

  // Parent Component Logic
handleStatusChange(event: { concept: MiningConcept, newStatus: string }): void {
  const currentRowIndex = this.allCells[this.currentIndex()].rowIndex;

  this.allMiningResults.update(results => 
    results.map(item => {
      // Matches the specific row AND the specific text fragment
      if (item.rowIndex === currentRowIndex && item.originalText === event.concept.originalText) {
        return { ...item, clinicalStatus: event.newStatus as ClinicalStatus };
      }
      return item;
    })
  );
}*/

}