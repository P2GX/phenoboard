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
    <h2 mat-dialog-title>Enter ORCID</h2>
    
    <mat-dialog-content>
      <form [formGroup]="orcidForm">
        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>ORCID ID</mat-label>
          <input matInput 
                 formControlName="orcid"
                 placeholder="0000-0000-0000-0000"
                 maxlength="19">
          <mat-hint>Format: 0000-0000-0000-0000</mat-hint>
          <mat-error *ngIf="orcidForm.get('orcid')?.hasError('required')">
            ORCID is required
          </mat-error>
          <mat-error *ngIf="orcidForm.get('orcid')?.hasError('pattern')">
            Invalid ORCID format
          </mat-error>
        </mat-form-field>
      </form>
      
      <p class="orcid-info">
        ORCID provides a persistent digital identifier for researchers.
        <a href="https://orcid.org/" target="_blank">Learn more</a>
      </p>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" class="btn-outline-primary w-[300px]">Cancel</button>
      <button mat-raised-button 
              color="primary" 
              (click)="onSave()"
              [disabled]="orcidForm.invalid"
                class="btn-outline-primary w-[300px]">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .orcid-info {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      margin-top: 16px;
      font-size: 14px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .orcid-info mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    mat-dialog-content {
      min-width: 400px;
    }
  `],
  imports: [MatDialogContent, MatInputModule, MatIconModule, MatDialogModule, ReactiveFormsModule, CommonModule]
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