import { Component, input, computed, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HpoModifierMenuComponent } from '../modifier/hpo-modifier-menu';
import { CellValue } from '../../models/hpo_term_dto';
import { NotificationService } from 'ng-hpo-uikit';
import { AgeInputService } from '../../services/age_service';


@Component({
  selector: 'app-hpo-annotation-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HpoModifierMenuComponent],
  templateUrl: './table-cell-editor.component.html',
  styleUrl: './table-cell-editor.component.scss'
})
export class TableCellEditorComponent {
  cellData = input.required<CellValue>();
  columnTitle = input.required<string>();
  dataChanged = output<CellValue>();
  private notificationService = inject(NotificationService);
  private ageService = inject(AgeInputService);
  

  hasOnset = computed(() => this.cellData()?.type === 'OnsetAge');
  availableOnsetTerms = this.ageService.selectedTerms; 
  onsetText = computed(() => {
    const current = this.cellData();
    return current.type === 'OnsetAge' ? current.data : '';
  });

isSelectingOnset = false;
// The parent component will open the new-onset dialog and update the CellValue
// this avoids race condition with closing the dialog and transmitting a new CellValue
requestNewOnset = output<void>();

toggleOnsetSelection(): void {
  // If it's already OnsetAge, clicking toggles the dropdown visibility view
  if (this.cellData().type === 'OnsetAge') {
    // Optional: add logic here if you want it to revert to 'Na' or 'Observed' on toggle-off
    return;
  }
  this.isSelectingOnset = !this.isSelectingOnset;
}

updateStatus(newStatus: 'Observed' | 'Excluded' | 'Na' | 'OnsetAge', onsetString?: string): void {
  const currentData = this.cellData();
  
  if (newStatus === 'OnsetAge') {
    if (!onsetString) {
      this.notificationService.showError("Could not set onset because no onset string was found");
      return;
    }
    this.isSelectingOnset = false;

    this.dataChanged.emit({
      ...currentData,
      type: 'OnsetAge',
      data: onsetString
    });
  } else {
    // If they switch to Observed/Excluded/Na, reset our temporary selector state
    this.isSelectingOnset = false;
    this.dataChanged.emit({
      ...currentData,
      type: newStatus
    });
  }
}

 

  addModifier(newModifier:  string): void {
   const currentData = this.cellData();
   const currentModifiers = currentData.modifiers || [];
   if (!currentModifiers.includes(newModifier)) {
      const updatedData: CellValue = {
        ...currentData,
        modifiers: [...currentModifiers, newModifier] // Create a brand new array reference
      };   
      this.dataChanged.emit(updatedData);
  }
}

  removeModifier(modiferIdToRemove: string): void {
   const currentData = this.cellData();
    if (!currentData.modifiers) return;

    const updatedData: CellValue = {
      ...currentData,
      modifiers: currentData.modifiers.filter(m => m !== modiferIdToRemove) 
    };
    this.notificationService.showSuccess(`Updated cell to "${formatCellValue(updatedData)}"`);
    this.dataChanged.emit(updatedData);
  }

  /* THe parent component will receive this signal and then open the new Age Dialog itself */
  openAddAgeDialog(): void {
    this.requestNewOnset.emit();
  }
}

export function formatCellValue(cell: CellValue): string {
  if (cell.type === 'OnsetAge') return `Onset Age: ${cell.data}`;
  return `Status: ${cell.type === 'Na' ? 'N/A' : cell.type}`;
}