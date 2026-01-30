import { Component, effect, EventEmitter, inject, input, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MinedCell, MappedTerm } from "../models/hpo_mapping_result";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatTableModule } from "@angular/material/table";
import { AgeInputService } from "../services/age_service";
import { MatDialog } from "@angular/material/dialog";
import { AddagesComponent } from "../addages/addages.component";

@Component({
  selector: 'app-mined-cell-editor',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatButtonModule, 
    MatChipsModule, 
    MatIconModule, 
    MatMenuModule, 
    MatTableModule
  ],
  templateUrl: "./mined-cell-editor.component.html",
  styleUrls: ["./mined-cell-editor.component.scss"]
})
export class MinedCellEditorComponent {
  cell = input.required<MinedCell>();
  private ageService = inject(AgeInputService);
   private dialog = inject(MatDialog);
  @Output() cellChange = new EventEmitter<MinedCell>();

  constructor() {
    /**
     * 2. Debugging Data: The 'effect' runs whenever the 'cell' signal updates.
     * This replaces the need for ngOnChanges for debugging purposes.
     */
    effect(() => {
      console.log('🔍 Signal Debug - MinedCell updated:', this.cell());
    });
  }

  // Available statuses for the quick-setter
  readonly statusOptions = ['observed', 'excluded', 'na'];

  updateStatus(term: MappedTerm, newStatus: any) {
    term.status = newStatus;
    this.cellChange.emit(this.cell());
  }

  // Assuming your Onset Widget is another component or a specific logic
  openOnsetPicker(term: MappedTerm) {
    // Logic to trigger your onset widget
    // term.onset = result;
    // this.cellChange.emit(this.cell);
  }

  get availableOnsetTerms(): string[] {
      return this.ageService.getSelectedTerms();
    }
  
  

    updateOnset(term: MappedTerm, newOnset: string) {
        term.onset = newOnset;
        this.emitChange();
        }

addOnsetString(term: MappedTerm) {
   const dialogRef = this.dialog.open(AddagesComponent, {
            width: '400px',
            data: {  data: { existingAges: this.ageService.getSelectedTerms() } }
          });
      
          dialogRef.afterClosed().subscribe(result => {
            if (result) {
              if (result.length == 1) {
                const onset = result[0];
                 term.onset = onset;
                this.ageService.addSelectedTerm(onset);
                this.emitChange();
              } else {
                result.forEach((r: string) => {this.ageService.addSelectedTerm(r); });
              }
            }
          });
    }


private emitChange() {
  // We emit a clone or the mutated reference so the parent 
  // can trigger the Tauri 'save' command.
  this.cellChange.emit({ ...this.cell() });
}
}