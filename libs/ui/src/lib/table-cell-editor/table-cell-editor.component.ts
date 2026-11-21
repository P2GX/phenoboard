import { Component, input, computed, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CellValue, HpoTermDuplet } from '../models/hpo_term_dto';
import { NotificationService } from 'ng-hpo-uikit';
import { AgeService } from 'ng-hpo-uikit';
//import { HpoModifierService } from 'src/app/services/hpo_modifier_service';
import { HpoModifierMenuComponent } from '../modifier-menu/hpo-modifier-menu';

@Component({
  selector: 'app-hpo-annotation-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HpoModifierMenuComponent],
  templateUrl: './table-cell-editor.component.html',
  styleUrl: './table-cell-editor.component.scss',
})
export class TableCellEditorComponent {
  cellData = input.required<CellValue>();
  columnTitle = input.required<string>();
  dataChanged = output<CellValue>();
  private notificationService = inject(NotificationService);
  private ageService = inject(AgeService);
  filterModifiersFn = input.required<(query: string) => HpoTermDuplet[]>();
  initModifiersFn = input<() => Promise<void>>(() => Promise.resolve());
  getModifierLabelFn = input.required<(modId: string) => string>();
  // The parent component will open the new-onset dialog and update the CellValue
  // this avoids race condition with closing the dialog and transmitting a new CellValue
  requestNewOnset = output<void>();
  hasOnset = computed(() => this.cellData()?.type === 'OnsetAge');
  availableOnsetTerms = this.ageService.selectedTerms;
  onsetText = signal<string>('');
  onsetLabel = computed(() => {
    const cell = this.cellData();
    return cell.type === 'OnsetAge' ? cell.data : 'Onset';
  });

  cellType = computed(() => {
    const cell = this.cellData();
    return cell ? cell.type : 'Na';
  });

  showOnsetPicker = signal(false);
  // do not show the modifiers section if the status is Na or Excluded!
  showModifiers = computed(() => {
    const t = this.cellType();
    return t === 'Observed' || t === 'OnsetAge';
  });

  constructor() {
    effect(() => {
      const data = this.cellData();
      if (data.type === 'OnsetAge') {
        this.onsetText.set(data.data);
      }
    });
  }

  toggleOnsetSelection(): void {
    const currentData = this.cellData();
    if (currentData.type === 'OnsetAge') {
      return; // already committed; dropdown already visible via cellType()
    }
    this.showOnsetPicker.update((v) => !v);
  }

  cancelOnsetSelection(): void {
    this.showOnsetPicker.set(false);
  }

  updateStatus(newStatus: 'Observed' | 'Excluded' | 'Na' | 'OnsetAge', onsetString?: string): void {
    const currentData = this.cellData();

    if (newStatus === 'OnsetAge') {
      // 1. If we have a string, we commit the data
      if (onsetString) {
        this.dataChanged.emit({
          type: 'OnsetAge',
          data: onsetString,
          modifiers: currentData.modifiers
        });
        this.showOnsetPicker.set(false);
      } else {
        this.showOnsetPicker.set(true);
        this.notificationService.showError('Please select an onset age.');
      }
    } else {
      // For Excluded/Na, drop any existing onset/modifier data
      if (newStatus === 'Na' || newStatus === 'Excluded') {
        this.dataChanged.emit({type: newStatus});
      } else {
        // observed - keep modifiers, but drop any stale onset data
        this.dataChanged.emit({
          type: 'Observed',
          modifiers: currentData.modifiers
        });
      }
      this.showOnsetPicker.set(false);
    }
  }

  addModifier(newModifier: string): void {
    const currentData = this.cellData();
    const currentModifiers = currentData.modifiers || [];
    if (!currentModifiers.includes(newModifier)) {
      const updatedData: CellValue = {
        ...currentData,
        modifiers: [...currentModifiers, newModifier], // Create a brand new array reference
      };
      this.dataChanged.emit(updatedData);
    }
  }

  removeModifier(modiferIdToRemove: string): void {
    const currentData = this.cellData();
    if (!currentData.modifiers) return;

    const updatedData: CellValue = {
      ...currentData,
      modifiers: currentData.modifiers.filter((m) => m !== modiferIdToRemove),
    };
    this.notificationService.showSuccess(`Updated cell to "${formatCellValue(updatedData)}"`);
    this.dataChanged.emit(updatedData);
  }

  /* The parent component will receive this signal and then open the new Age Dialog itself */
  openAddAgeDialog(): void {
    this.showOnsetPicker.set(true);
    this.requestNewOnset.emit();
  }
}

export function formatCellValue(cell: CellValue): string {
  if (cell.type === 'OnsetAge') return `Onset Age: ${cell.data}`;
  return `Status: ${cell.type === 'Na' ? 'N/A' : cell.type}`;
}
