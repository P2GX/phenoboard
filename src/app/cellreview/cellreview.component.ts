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

import { inject } from '@angular/core';
import { ask } from '@tauri-apps/plugin-dialog';
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


  async onCancel() {
    const confirmExit = await ask('Discard changes?', {
      title: 'Confirm Exit',
      kind: 'warning',
      okLabel: 'Discard',
      cancelLabel: 'Stay here'
    });

    if (confirmExit) {
      this.dialogRef.close(null);
    }
  }

}