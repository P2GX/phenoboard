import { MatDialogRef } from "@angular/material/dialog";
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { Component } from "@angular/core";
import { CommonModule } from "@angular/common"; 

@Component({
  selector: 'app-hpo-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatSelectModule, MatOptionModule, MatChipsModule, FormsModule],
  templateUrl: './multihpo-dialog-vis-component.html',
  styleUrls: []
})
export class MultipleHpoDialogComponent {
  entries: { hpoId: string; label: string; status: 'observed' | 'excluded' }[] = [];
  private originalEntries: typeof this.entries = [];
  editMode = false;

  constructor(private dialogRef: MatDialogRef<MultipleHpoDialogComponent>) {}

  toggleEdit() {
    if (!this.editMode) {
      // entering edit mode → make a deep copy
      this.originalEntries = this.entries.map(e => ({ ...e }));
      this.editMode = true;
    } else {
      // leaving edit mode without saving → restore original
      this.entries = this.originalEntries.map(e => ({ ...e }));
      this.editMode = false;
    }
  }

  onCancel() {
    this.dialogRef.close(null); // closing the dialog entirely
  }

  onSave() {
    this.dialogRef.close(this.entries); // return updated data
  }
}
