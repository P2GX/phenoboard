import { Component, Input, Output, EventEmitter, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HpoModifierMenuComponent } from '../modifier/hpo-modifier-menu';
import { CellValue } from '../../models/hpo_term_dto';


@Component({
  selector: 'app-hpo-annotation-panel',
  standalone: true,
  imports: [CommonModule, HpoModifierMenuComponent],
  templateUrl: './table-cell-editor.component.html',
  styleUrl: './table-cell-editor.component.scss'
})
export class TableCellEditorComponent {
  @Input({ required: true }) cellData!: CellValue;
  @Input({required: true}) columnTitle! :string;
  @Output() dataChanged = new EventEmitter<CellValue>();

  updateStatus(newStatus: 'Observed' | 'Excluded' | 'Na') {
    this.cellData.type = newStatus;
    this.emitChanges();
  }

  addModifier(newModifier:  string ) {
    if (!this.cellData.modifiers) {
      this.cellData.modifiers = [];
    }
    if (!this.cellData.modifiers.some(m => m === newModifier)) {
      this.cellData.modifiers.push(newModifier);
      this.emitChanges();
    }
  }

  removeModifier(modiferIdToRemove:  string ) {
    if (! this.cellData.modifiers) return;
    this.cellData.modifiers = this.cellData.modifiers.filter(
      m => m !== modiferIdToRemove
    );
    this.emitChanges();
  }

  private emitChanges() {
    this.dataChanged.emit({ ...this.cellData });
  }
}