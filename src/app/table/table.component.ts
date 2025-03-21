import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { invoke } from '@tauri-apps/api/core';
import { Router } from '@angular/router';




@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent {
  dataForm: FormGroup;
  tableData: string[] = [];
  jsonData: string = '';
  showTable: boolean = false;
  errorMessage: string = '';
  

  constructor(private fb: FormBuilder, private router: Router) {
    this.dataForm = this.fb.group({
      diseaseId: ['', [Validators.required, Validators.pattern(/^OMIM:\d{6}$/)]],
      diseaseName: ['', [Validators.required, this.noLeadingOrTrailingWhitespace]],
      hgnc: ['', [Validators.required, Validators.pattern(/^HGNC:\d+$/)]],
      symbol: ['', [Validators.required, this.noLeadingOrTrailingWhitespace]],
      transcript: ['', [Validators.required, Validators.pattern(/^[\w]+\.\d+$/)]],
      multiText: ['', [Validators.required]], // 
    });
  }

  noLeadingOrTrailingWhitespace(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && (value.trim().length < 2 || value !== value.trim())) {
      return { whitespace: true };
    }
    return null;
  }

  onSubmit() {
    if (this.dataForm.valid) {
      const diseaseId = this.dataForm.get('diseaseId')?.value;
      const diseaseName = this.dataForm.get('diseaseName')?.value;
      const hgnc = this.dataForm.get('hgnc')?.value;
      const symbol = this.dataForm.get('symbol')?.value;
      const transcript = this.dataForm.get('transcript')?.value;
      const multiText = this.dataForm.get('multiText')?.value;

      console.log("Disease ID:", diseaseId);
      console.log("Disease Name:", diseaseName);
      console.log("HGNC:", hgnc);
      console.log("Symbol:", symbol);
      console.log("Transcript:", transcript);
      console.log("Multi Text:", multiText);
   
      invoke<string>('get_table_columns_from_seeds', { 
          diseaseId: diseaseId,
          diseaseName: diseaseName,
          hgncId: hgnc,
          geneSymbol: symbol,
          transcriptId: transcript,
          inputText: multiText 
       })
        .then((response) => {
          try {
            console.log("output");
            console.log("Success:", response);
            this.jsonData = JSON.parse(response);
            this.showTable = true;
            this.errorMessage = '';
          } catch (error) { 
            console.error('Invalid JSON format:', error);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          this.errorMessage = 'Failed to process the data. Please try again.';
        });
    } else {
      console.log("Form has errors!");
      this.markAllFieldsAsTouched();
    }
  }


  hasError(field: string): boolean {
    return this.dataForm.controls[field].invalid && this.dataForm.controls[field].touched;
  }

  markAllFieldsAsTouched() {
    Object.keys(this.dataForm.controls).forEach(field => {
      const control = this.dataForm.get(field);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  // This button is clicked when the user wants to edit the new table
  async onEditButtonClick() {
    try {
      this.router.navigate(["/table"]);
      console.log("navigating to table");
    } catch (error) {
      console.error('Error invoking onEditButtonClick:', error);
    }
  }

}
