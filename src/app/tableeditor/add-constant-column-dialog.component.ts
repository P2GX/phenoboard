import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatInputModule } from "@angular/material/input";
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-add-constant-column-dialog',
  template: `
    <h1 mat-dialog-title>Add Constant Column</h1>
    <div mat-dialog-content class="dialog-content">
      <mat-form-field appearance="fill" class="w-full">
        <mat-label>Column Name</mat-label>
        <input 
          matInput 
          [(ngModel)]="data.columnName"
          autofocus
          autocapitalize="none"
          spellcheck="false"
          autocomplete="off" 
          name="columnName" />
      </mat-form-field>

      <mat-form-field appearance="fill" class="w-full">
        <mat-label>Constant Value</mat-label>
        <input 
          matInput 
          [(ngModel)]="data.constantValue"
          autofocus
          autocapitalize="none"
          spellcheck="false"
          autocomplete="off" 
          name="constantValue" />
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end" class="flex gap-3 px-4 pt-2 pb-2">
      <button mat-button (click)="onCancel()" class="btn-outline-cancel">Cancel</button>
      <button mat-flat-button (click)="onSave()" class="btn-outline-primary">Add</button>
    </div>
  `,
  styles: [`
    .dialog-content {
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }
    mat-form-field {
      margin-bottom: 16px;
    }
  `],
  imports: [MatInputModule, CommonModule, FormsModule]
})

export class AddConstantColumnDialogComponent {
   public dialogRef = inject(MatDialogRef<AddConstantColumnDialogComponent>);
   public data = inject(MAT_DIALOG_DATA) as { columnName: string; constantValue: string };

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    this.dialogRef.close(this.data);
  }
}
