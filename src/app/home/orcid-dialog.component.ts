// orcid-dialog.component.ts
import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

export interface OrcidDialogData {
  currentOrcid?: string;
}

/* Component to allow users to enter their ORCID identifier */
@Component({
  selector: 'app-orcid-dialog',
  template: `
    <h2 mat-dialog-title class="!mb-4 text-xl font-semibold"> Enter ORCID researcher identifier</h2>
    
    <mat-dialog-content class="!pt-3">
      <form [formGroup]="orcidForm" class="mt-2">
        <mat-form-field appearance="outline" class="w-full">
          
          <input matInput 
                 formControlName="orcid"
                 placeholder="0000-0000-0000-0000"
                 maxlength="19">
          <mat-hint>Format: 0000-0000-0000-0000</mat-hint>
          <mat-error *ngIf="orcidForm.get('orcid')?.hasError('required')">ORCID is required</mat-error>
          <mat-error *ngIf="orcidForm.get('orcid')?.hasError('pattern')">Invalid ORCID format</mat-error>
        </mat-form-field>
      </form>
      
      <div class="orcid-info">
        <mat-icon>info</mat-icon>
        <span>
          ORCID provides a persistent digital identifier for researchers.
          <a href="https://orcid.org/" target="_blank" class="text-blue-600 underline">Learn more</a>
        </span>
      </div>
    </mat-dialog-content>
    
    <div class="p-4 flex justify-end gap-3">
      <button type="button" 
              (click)="onCancel()" 
              class="btn-outline-primary px-6 py-2 min-w-[100px]">
        Cancel
      </button>
      <button type="button"
              (click)="onSave()"
              [disabled]="orcidForm.invalid"
              class="btn-outline-primary px-6 py-2 min-w-[100px] disabled:opacity-50">
        Save
      </button>
    </div>
  `,
  styles: [`
    /* 1. Kill the ghost scrollbar/line */
    mat-dialog-content {
      min-width: 400px;
      overflow: hidden !important; /* This kills the vertical line */
      display: block !important;
      border-top: none !important; /* Removes the divider line Material adds */
      border-bottom: none !important;
      padding-top: 16px !important; /* Room for the label */
    }

    /* 2. Style the info box */
    .orcid-info {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin-top: 20px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #4b5563;
      border: 1px solid #e5e7eb;
    }

    /* 3. Ensure the title doesn't add a divider */
    [mat-dialog-title] {
      margin: 0;
      padding: 24px 24px 10px 24px;
      border-bottom: none !important;
    }
  `],
  standalone: true,
  imports: [MatDialogModule, MatInputModule, MatIconModule, ReactiveFormsModule, CommonModule]
})
export class OrcidDialogComponent {
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<OrcidDialogComponent>);
    public data = inject<OrcidDialogData>(MAT_DIALOG_DATA);
    orcidForm: FormGroup = this.fb.group({
      orcid: [
        this.data?.currentOrcid || '', 
        [
          Validators.required,
          Validators.pattern(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)
        ]
      ]
    });
  

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.orcidForm.valid) {
      this.dialogRef.close(this.orcidForm.value.orcid);
    }
  }
}