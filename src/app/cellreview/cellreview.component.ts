import { MAT_DIALOG_DATA, MatDialogRef, MatDialogActions, MatDialog, MatDialogContent } from "@angular/material/dialog";
import { MiningConcept } from "../models/hpo_mapping_result";
import { ConfigService } from "../services/config.service";
import { Component, computed, Inject } from "@angular/core";
import { MatButtonToggle, MatButtonToggleGroup } from "@angular/material/button-toggle";
import { MatIcon } from "@angular/material/icon";
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms'; // 1. Import from @angular/forms
import { AddagesComponent } from '../addages/addages.component'; // Adjust path as needed
import { inject, Input, NgZone } from '@angular/core';
import { MatChip } from "@angular/material/chips";
import { AgeInputService } from '../services/age_service';

export interface SpreadsheetCell {
  original: string;    // The raw text from the spreadsheet (e.g., "Fever, NK, Jaundice")
  processed: string;   // The final HPO string (e.g., "HP:0001945-observed;HP:0000952-observed")
  rowIndex: number;    
}


@Component({
  selector: 'app-cell-review',
  standalone: true,
  imports: [FormsModule, MatButtonToggle, MatDialogActions, MatIcon, MatButtonToggleGroup, MatTableModule, MatDialogContent, MatChip],
  templateUrl: './cellreview.component.html',
  styleUrls: ['./cellreview.component.scss']
})
export class CellReviewComponent {
  currentIndex = 0;
 // The table for the current cell
  conceptsForThisCell: MiningConcept[] = [];

  public data = inject(MAT_DIALOG_DATA) as { 
    cells: SpreadsheetCell[], 
    miningResults: MiningConcept[],
    title: string 
  };
  private ageService = inject(AgeInputService);
  private dialog = inject(MatDialog);
   public dialogRef = inject(MatDialogRef<CellReviewComponent>);

   allCells: SpreadsheetCell[] =  this.data.cells;
   allMiningResults: MiningConcept[] = this.data.miningResults;
  readonly globalAgeEntries = computed(() => this.ageService.getSelectedTerms());
    constructor() {
        this.loadCell();
    }

  async loadCell() {
    const currentCellText = this.allCells[this.currentIndex].original;
    this.conceptsForThisCell = this.allMiningResults.filter(concept => 
      currentCellText.includes(concept.originalText)
    );
  }

  next() {
    if (this.currentIndex < this.allCells.length - 1) {
      this.currentIndex++;
      this.loadCell();
    } else {
      this.dialogRef.close(this.allMiningResults);
    }
  }

  prev() {
    if (this.currentIndex > 0) {
        this.currentIndex--;
        this.loadCell(); 
    }
}

  // Add this to your class
toggleAgeForConcept(concept: MiningConcept, age: string) {
  let ages = concept.onsetString ? concept.onsetString.split(';') : [];
  
  if (ages.includes(age)) {
    // Remove it if already there
    ages = ages.filter(a => a !== age);
  } else {
    // Add it
    ages.push(age);
  }
  
  concept.onsetString = ages.join(';');
}

// Update your picker method to ensure the Service stays in sync
openAgePicker(concept: MiningConcept) {
  const existing = concept.onsetString ? concept.onsetString.split(';') : [];
  
  // Optional: Sync service state before opening if your AddagesComponent relies on it
  // this.ageService.setSelectedTerms(existing); 

  const dialogRef = this.dialog.open(AddagesComponent, {
    width: '450px',
    data: { existingAges: existing }
  });

  dialogRef.afterClosed().subscribe((result: string[] | undefined) => {
    if (result) {
      concept.onsetString = result.join(';');
      // The AddagesComponent already updates the service, 
      // so your globalAgeEntries() signal will refresh automatically!
    }
  });
}

}