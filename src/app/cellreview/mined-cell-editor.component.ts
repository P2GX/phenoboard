import { Component, computed, inject, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MinedCell, MappedTerm, ClinicalStatus } from "../models/hpo_mapping_result";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatTableModule } from "@angular/material/table";
import { AgeInputService } from "../services/age_service";
import { MatDialog } from "@angular/material/dialog";
import { AddageComponent } from "../addages/addage.component";


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
  toExclude = input.required<{id: string, label: string}[]>();
  cellChange = output<MinedCell>();
  excludeTerm = output<{id: string, label: string}>();
  excludeAll = output<void>();
  restoreTerm = output<MappedTerm>();
  
  private ageService = inject(AgeInputService);
  private dialog = inject(MatDialog);
  readonly observedTerms = computed(() => 
    this.cell().mappedTermList.filter(t => t.status !== 'excluded')
  );

  readonly excludedTerms = computed(() => 
    this.cell().mappedTermList.filter(t => t.status === 'excluded')
  );
  readonly hasExclusions = computed(() => (this.excludedTerms().length ?? 0) > 0);

  readonly Status = ClinicalStatus;

  // Available statuses for the quick-setter
  readonly statusOptions = ['observed', 'excluded', 'na'];

  // called if the user changes status from observed to excluded or na
  updateStatus(term: MappedTerm, newStatus: string): void {
    const updatedCell: MinedCell = {
      ...this.cell(),
      mappedTermList: this.cell().mappedTermList.map(t => 
        t.hpoId === term.hpoId 
          ? { ...t, status: newStatus as ClinicalStatus } 
          : t
      )
    };
    this.cellChange.emit(updatedCell);
  }


    get availableOnsetTerms(): string[] {
      return this.ageService.selectedTerms();
    }
  
  
    /* Set the onset of the indicated HPO term */
    updateOnset(term: MappedTerm, newOnset: string): void {
      console.log("updateOnset term=", term, "newOnset=", newOnset);
      const updatedCell: MinedCell = {
        ...this.cell(),
        mappedTermList: this.cell().mappedTermList.map(t => 
          t.hpoId === term.hpoId ? { ...t, onset: newOnset } : t
        )
      };
      this.cellChange.emit(updatedCell);
    }

      addOnsetString(term: MappedTerm): void {
          const dialogRef = this.dialog.open(AddageComponent, {
            width: '400px',
            data: {  data: { existingAges: this.ageService.selectedTerms() } }
            });
        
          dialogRef
            .afterClosed()
            .subscribe(result => {
              if (!result) return;
              if (typeof result !== 'string') {
                // should never happen...
                alert(`Addagecomponent did not return a string but instead: ${result} `);
                return;
              }
              this.ageService.addSelectedTerm(result);
              const updatedCell: MinedCell = {
                ...this.cell(),
                mappedTermList: this.cell().mappedTermList.map(t => 
                  t.hpoId === term.hpoId ? { ...t, onset: result } : t
                )
              };
              this.cellChange.emit(updatedCell);
            });
      }

   
 
}