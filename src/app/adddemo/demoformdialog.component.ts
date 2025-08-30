import { Component, Inject } from '@angular/core';
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
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
  commentControl = new FormControl<string>(this.data?.comment ?? '', [
    asciiValidator()
  ]);

  constructor(
    private dialogRef: MatDialogRef<DemoFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { comment: string }
  ) {}

  save() {
    if (this.commentControl.valid) this.dialogRef.close(this.commentControl.value);
  }
  cancel() {
    this.dialogRef.close(undefined);
  }
}
