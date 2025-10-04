import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-split-column-dialog',
  standalone: true,
  template: `
    <h2 mat-dialog-title>Split Column</h2>
    <form [formGroup]="form" class="dialog-form">
      <mat-form-field class="w-full">
        <mat-label>Separator character</mat-label>
        <input matInput formControlName="separator" maxlength="3" placeholder="e.g. /">
      </mat-form-field>

      <mat-form-field class="w-full">
        <mat-label>Which is Sex?</mat-label>
        <mat-select formControlName="sexPosition">
          <mat-option [value]="0">First</mat-option>
          <mat-option [value]="1">Second</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field class="w-full">
        <mat-label>Which is Age?</mat-label>
        <mat-select formControlName="agePosition">
          <mat-option [value]="0">First</mat-option>
          <mat-option [value]="1">Second</mat-option>
        </mat-select>
      </mat-form-field>
    </form>

    <div class="dialog-actions">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="confirm()" [disabled]="form.invalid">OK</button>
    </div>
  `,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatInputModule, MatSelectModule, MatButtonModule],
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 1rem; width: 300px; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
  `]
})
export class SplitColumnDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SplitColumnDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      separator: [data.separator ?? '/', Validators.required],
      sexPosition: [0, Validators.required],
      agePosition: [1, Validators.required],
    });
  }

  confirm() {
    this.dialogRef.close(this.form.value);
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
