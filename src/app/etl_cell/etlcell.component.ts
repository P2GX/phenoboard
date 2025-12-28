import { Component, EventEmitter, Input, Output, signal } from "@angular/core";
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EtlCellValue } from "../models/etl_dto";
import { EtlCellStatus } from "../models/etl_dto";

import { MatDialog } from "@angular/material/dialog";
import { EtlCellEditDialogComponent } from "./etl-cell-edit-dialog.component";

@Component({
  selector: 'etl-cell',
  templateUrl: './etlcell.component.html',
  styleUrls: ['./etlcell.component.css'],
  imports: [CommonModule, MatTooltipModule],
})
export class EtlCellComponent {
  @Input() cell!: EtlCellValue;
  @Input() rowIndex!: number;
  @Input() colIndex!: number;

  @Output() edited = new EventEmitter<{ rowIndex: number, colIndex: number, newValue: string }>();

  // Signals for reactive display
  current = signal('');
  status = signal<EtlCellStatus.Raw | EtlCellStatus.Transformed | EtlCellStatus.Error>(EtlCellStatus.Raw);
  error = signal<string | undefined>(undefined);

  constructor(private dialog: MatDialog) {}

  ngOnInit() {
    // Initialize signals from the DTO
    this.syncSignalsFromDto();
  }

  /** Sync signals from the underlying DTO */
  private syncSignalsFromDto() {
    this.current.set(this.cell.current);
    this.status.set(this.cell.status);
    this.error.set(this.cell.error || undefined);
  }

  /** Apply a transformed value */
  setTransformed(newValue: string) {
    this.current.set(newValue);
    this.status.set(EtlCellStatus.Transformed);
    this.error.set(undefined);
    this.syncDtoFromSignals();
    this.emitChange();
  }

  /** Apply an error value */
  setError(errorMessage: string) {
    this.status.set(EtlCellStatus.Error);
    this.error.set(errorMessage);
    this.syncDtoFromSignals();
    this.emitChange();
  }

  /** Reset to raw */
  resetRaw() {
    this.current.set('');
    this.status.set(EtlCellStatus.Raw);
    this.error.set(undefined);
    this.syncDtoFromSignals();
    this.emitChange();
  }

  /** Sync the DTO object from current signals */
  private syncDtoFromSignals() {
    this.cell.current = this.current();
    this.cell.status = this.status();
    this.cell.error = this.error();
  }

  /** Emit change to parent component */
  private emitChange() {
    this.edited.emit({
      rowIndex: this.rowIndex,
      colIndex: this.colIndex,
      newValue: this.current(),
    });
  }

  /** Open manual edit dialog */
  editManually() {
    const dialogRef = this.dialog.open(EtlCellEditDialogComponent, {
      width: '300px',
      data: { original: this.cell.original, current: this.current() },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        this.setTransformed(result);
      }
    });
  }

  /** Right-click handler */
  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.editManually();
  }
}
