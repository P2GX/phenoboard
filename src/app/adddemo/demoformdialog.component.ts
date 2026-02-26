import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { asciiValidator } from '../validators/validators';

@Component({
  selector: 'app-demo-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './demoformdialog.component.html',
})
export class DemoFormDialogComponent {
  private dialogRef = inject(MatDialogRef<DemoFormDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as { comment: string };

  commentControl = new FormControl<string>(this.data?.comment ?? '', [
    asciiValidator()
  ]);

  save() {
    if (this.commentControl.valid) this.dialogRef.close(this.commentControl.value);
  }
  cancel() {
    this.dialogRef.close(undefined);
  }
}
