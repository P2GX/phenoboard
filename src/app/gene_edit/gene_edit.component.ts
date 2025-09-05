import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { GeneVariantData } from '../models/cohort_dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select'; 
import { MatOptionModule } from '@angular/material/core';  
import { CommonModule } from '@angular/common';



@Component({
  selector: 'app-disease-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule
  ],
  templateUrl: './gene_edit.component.html',
  styleUrl: './gene_edit.component.css'
})
export class GeneEditComponent {
  alleleKey: string;
  count: number;

  constructor(
    private dialogRef: MatDialogRef<GeneEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.alleleKey = data.alleleKey ?? '';
    this.count = data.allelecount ?? 0;
  }

  save() {
    this.dialogRef.close({
      action: this.data.alleleKey ? 'update' : 'add',
      alleleKey: this.alleleKey,
      count: this.count
    });
  }

  delete() {
    this.dialogRef.close({
      action: 'delete',
      alleleKey: this.data.alleleKey
    });
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
