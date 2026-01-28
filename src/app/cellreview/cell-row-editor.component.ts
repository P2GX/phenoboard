import { CommonModule } from "@angular/common";
import { Component, computed, input, output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatTableModule } from "@angular/material/table";
import { MiningConcept } from "../models/hpo_mapping_result";
import { MatChipsModule } from "@angular/material/chips";

@Component({
  selector: 'app-cell-row-editor',
  standalone: true,
  imports: [MatTableModule, MatButtonToggleModule, MatMenuModule, MatIconModule, MatButtonModule, CommonModule, MatChipsModule],
  templateUrl: './cell-row-editor.component.html'
})
export class CellRowEditorComponent {
  // The concepts specifically for this row
  concepts = input.required<MiningConcept[]>();
  // All unique concepts in the column (for the exclusion list)
  allColumnConcepts = input.required<MiningConcept[]>();
  
  onToggleExclude = output<MiningConcept>();
  onStatusChange = output<{ concept: MiningConcept, newStatus: string }>();

  absentConcepts = computed(() => {
    const currentTexts = new Set(this.concepts().map(c => c.originalText.toLowerCase()));
    return this.allColumnConcepts().filter(c => !currentTexts.has(c.originalText.toLowerCase()));
  });

  isExcluded(term: MiningConcept) {
    return this.concepts().some(c => 
      c.originalText === term.originalText && c.clinicalStatus === 'excluded'
    );
  }

  toggleExclude(concept: MiningConcept) {
    // emit the concept that needs toggling
    this.onToggleExclude.emit(concept);
  }
  updateStatus(concept: MiningConcept, newStatus: string) {
    this.onStatusChange.emit({ concept, newStatus });
  }
}