import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { invoke } from '@tauri-apps/api/core';
import { Router } from '@angular/router';
import { TemplateDtoService } from '../services/template_dto_service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { TemplateDto } from '../models/template_dto';




@Component({
  selector: 'app-newtemplate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './newtemplate.component.html',
  styleUrl: './newtemplate.component.scss'
})
export class NewTemplateComponent extends TemplateBaseComponent implements OnInit, OnDestroy  {
  constructor(
    private fb: FormBuilder, 
    private router: Router,
    ngZone: NgZone, 
    templateService: TemplateDtoService,
    cdRef: ChangeDetectorRef) {
      super(templateService, ngZone, cdRef);
    this.dataForm = this.fb.group({
      diseaseId: ['', [Validators.required, Validators.pattern(/^OMIM:\d{6}$/)]],
      diseaseName: ['', [Validators.required, this.noLeadingOrTrailingWhitespace]],
      hgnc: ['', [Validators.required, Validators.pattern(/^HGNC:\d+$/)]],
      symbol: ['', [Validators.required, this.noLeadingOrTrailingWhitespace]],
      transcript: ['', [Validators.required, Validators.pattern(/^[\w]+\.\d+$/)]],
      multiText: ['', [Validators.required]], // 
    });
  }
  dataForm: FormGroup;
  tableData: string[] = [];
  jsonData: string = '';
  errorMessage: string = '';
  
   protected override onTemplateLoaded(template: TemplateDto): void {
      console.log("✅ Template loaded into HomeComponent:", template);
      this.cdRef.detectChanges();
    }
  
    protected override onTemplateMissing(): void {
      // When we open the page, the template will still be missing
    }


  noLeadingOrTrailingWhitespace(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && (value.trim().length < 2 || value !== value.trim())) {
      return { whitespace: true };
    }
    return null;
  }

  /** Activate by the submit button of the form. */
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

      invoke<string>('get_template_dto_from_seeds', { 
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

}
