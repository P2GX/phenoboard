import { Component, computed, effect, input, output, signal } from "@angular/core";
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
  cell = input.required<EtlCellValue>();
  rowIndex = input.required<number>();
  colIndex = input.required<number>();
  edited = output<{ rowIndex: number, colIndex: number, newValue: string }>();
  // Signals for reactive display
  current = signal('');
  status = signal<EtlCellStatus.Raw | EtlCellStatus.Transformed | EtlCellStatus.Error | EtlCellStatus.Ignored >(EtlCellStatus.Raw);
  error = signal<string | undefined>(undefined);

  constructor(private dialog: MatDialog) {
  // Whenever the input cell() changes, it pushes the new data into your local signals.
    effect(() => {
      const val = this.cell();
      this.current.set(val.current || '');
      this.status.set(val.status);
      this.error.set(val.error || undefined);
    });
  }

  ngOnInit() {
    // Initialize signals from the DTO
   // this.syncSignalsFromDto();
  }


  /** Apply a transformed value */
  setTransformed(newValue: string) {
    this.current.set(newValue);
    this.status.set(EtlCellStatus.Transformed);
    this.error.set(undefined);
    //this.syncDtoFromSignals();
    this.emitChange();
  }

  /** Apply an error value */
  setError(errorMessage: string) {
    this.status.set(EtlCellStatus.Error);
    this.error.set(errorMessage);
    //this.syncDtoFromSignals();
    this.emitChange();
  }

  /** Reset to raw */
  resetRaw() {
    this.current.set('');
    this.status.set(EtlCellStatus.Raw);
    this.error.set(undefined);
    //this.syncDtoFromSignals();
    this.emitChange();
  }

  /** Emit change to parent component */
  private emitChange() {
    this.edited.emit({
      rowIndex: this.rowIndex(),
      colIndex: this.colIndex(),
      newValue: this.current(),
    });
  }

  /** Open manual edit dialog */
  editManually() {
    const dialogRef = this.dialog.open(EtlCellEditDialogComponent, {
      width: '300px',
      data: { current: this.current() },
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

  readonly cellClass = computed(() => {
    const currentStatus = this.status();
    switch (currentStatus) {
      case EtlCellStatus.Raw:
        return 'cell-raw';
      case EtlCellStatus.Transformed:
        return 'cell-transformed';
      case EtlCellStatus.Error:
        return 'cell-error';
      case EtlCellStatus.Ignored:
        return 'cell-ignored';
      default:
        return '';
    }
  });

  readonly original = computed(() => this.cell().original);


  readonly tooltipText = computed(() => {
    const origVal = this.original();
    const currentVal = this.current();
    const errorVal = this.error();
    if (errorVal) {
      return `error: ${errorVal}`;
    }
    if (currentVal.length == 0) {
      return `${origVal} (raw)`
    }
    else {
      return  `original: ${origVal}\ntransformed: ${currentVal}`;
    }
  });

  
}
