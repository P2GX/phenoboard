import { Component, Inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "etl-cell-edit-dialog",
  standalone: true,
  imports: [FormsModule, MatIconModule],
  templateUrl: "./etl-cell-edit-dialog.component.html",
  styleUrl: "./etl-cell-edit-dialog.component.scss",
})
export class EtlCellEditDialogComponent {
  currentValue: string;

  constructor(
    public dialogRef: MatDialogRef<EtlCellEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { original: string; current: string }
  ) {
    this.currentValue = data.current;
  }

  save() {
    this.dialogRef.close(this.currentValue);
  }

  cancel() {
    this.dialogRef.close();
  }
}