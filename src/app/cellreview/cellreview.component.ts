import { MAT_DIALOG_DATA, MatDialogRef, MatDialogActions, MatDialog, MatDialogContent } from "@angular/material/dialog";
import { ClinicalStatus, MiningConcept } from "../models/hpo_mapping_result";
import { Component, computed, signal } from "@angular/core";
import { MatButtonToggle, MatButtonToggleGroup } from "@angular/material/button-toggle";
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from "@angular/material/icon";
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms'; // 1. Import from @angular/forms
import { AddagesComponent } from '../addages/addages.component'; // Adjust path as needed
import { inject } from '@angular/core';
import { MatChip } from "@angular/material/chips";
import { AgeInputService } from '../services/age_service';
import { newRawColumnDto } from "../models/etl_dto";

export interface SpreadsheetCell {
  original: string;    // The raw text from the spreadsheet (e.g., "Fever, NK, Jaundice")
  processed: string;   // The final HPO string (e.g., "HP:0001945-observed;HP:0000952-observed")
  rowIndex: number;    
}

/* This component cycles thought each row (for a column) and allows the user to confirm/edit the HPO mapping */
@Component({
  selector: 'app-cell-review',
  standalone: true,
  imports: [FormsModule, 
    MatButtonModule,
    MatButtonToggle, 
    MatButtonToggleGroup,
    MatChip,
    MatDialogActions, 
    MatDialogContent,
    MatIcon, 
    MatIconModule,
    MatMenuModule,
    MatTableModule],
  templateUrl: './cellreview.component.html',
  styleUrls: ['./cellreview.component.scss']
})
export class CellReviewComponent {
 

  public data = inject(MAT_DIALOG_DATA) as { 
    cells: SpreadsheetCell[], 
    miningResults: MiningConcept[],
    title: string 
  };
  private ageService = inject(AgeInputService);
  private dialog = inject(MatDialog);
  public dialogRef = inject(MatDialogRef<CellReviewComponent>);

  allCells: SpreadsheetCell[] =  this.data.cells;
  allMiningResults = signal<MiningConcept[]>(this.data.miningResults);

  readonly conceptsForThisCell = computed(() => {
    const currentIndex = this.currentIndex();
    const currentCell = this.allCells[currentIndex];
    if (!currentCell) return [];
    
    // Filter the signal value - get concepts that belong to the current window
    return this.allMiningResults().filter(concept => 
      concept.rowIndex === currentCell.rowIndex
    );
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
        concept.onsetString = result.join(';');
      }
    });
  }

  // 1. Get every unique concept text in the entire dataset
  readonly allUniqueConcepts = computed(() => {
    const results = this.allMiningResults();
    const unique = new Map<string, MiningConcept>();
    results.forEach(c => {
      if (!unique.has(c.originalText)) {
        unique.set(c.originalText, c);
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
          r.rowIndex === currentIndex && r.originalText === term.originalText
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

  toggleExclude(concept: MiningConcept): void {
    const currentIndex = this.currentIndex();
    const currentRowIndex = this.allCells[currentIndex].rowIndex;
    const targetText = concept.originalText;
    const currentList = this.allMiningResults();
    const existingIndex = currentList.findIndex(item =>
      item.rowIndex === currentRowIndex && item.originalText === targetText
    )
    if (existingIndex > -1) {
      this.allMiningResults.update(results => results.map((item, idx) => {
        if (idx == existingIndex) {
          const newStatus = item.clinicalStatus === ClinicalStatus.Excluded ? ClinicalStatus.NotAssessed : ClinicalStatus.Excluded;
          return { ...item, clinicalStatus: newStatus}
        }
        return item;
      }));
    } else {
      // it does not exist for this row. Create a new Excluded entry
      const newConcept: MiningConcept = {
        ...concept,
        rowIndex: currentRowIndex,
        clinicalStatus: ClinicalStatus.Excluded,
        onsetString: null
      };
      this.allMiningResults.update(results => [...results, newConcept]);
    }
  }

}