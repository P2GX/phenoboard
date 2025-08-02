import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { noLeadingTrailingSpacesValidator, noWhitespaceValidator } from '../validators/validators';
import { TemplateDtoService } from '../services/template_dto_service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { DiseaseGeneDto, newMendelianTemplate, TemplateDto } from '../models/template_dto';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ConfigService } from '../services/config.service';
import { PageService } from '../services/page.service';




/**
 * Component for creating a Template for a new disease. This is the first thing we need to use
 * when we are creating a Template for a new OMIM entry etc.
 */
@Component({
  selector: 'app-newtemplate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './newtemplate.component.html',
  styleUrls: ['./newtemplate.component.scss'],
})
export class NewTemplateComponent extends TemplateBaseComponent implements OnInit, OnDestroy  {

  constructor(
    private fb: FormBuilder, 
    private configService: ConfigService,
    ngZone: NgZone, 
    templateService: TemplateDtoService,
    cdRef: ChangeDetectorRef) {
      super(templateService, ngZone, cdRef);
      this.mendelianDataForm = this.fb.group({
        diseaseId: ['', [Validators.required, Validators.pattern(/^OMIM:\d{6}$/)]],
        diseaseName: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
        cohortAcronym: ['', [Validators.required, noWhitespaceValidator]],
        hgnc: ['', [Validators.required, Validators.pattern(/^HGNC:\d+$/)]],
        symbol: ['', [Validators.required, noWhitespaceValidator]],
        transcript: ['', [Validators.required, Validators.pattern(/^[\w]+\.\d+$/)]],
        multiText: ['', [Validators.required]], // 
      });
  }

  /* after the user submits data, we hide everything else and display a message */
  showSuccessMessage = false;

  digenicTemplate = false;
  meldedTemplate = false;
  mendelianTemplate = false;

  mendelianDataForm: FormGroup;
  tableData: string[] = [];
  jsonData: string = '';
  errorMessage: string | null = null;

  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }
  
  protected override onTemplateLoaded(template: TemplateDto): void {
    console.log("✅ Template loaded into HomeComponent:", template);
    this.cdRef.detectChanges();
  }
  
    protected override onTemplateMissing(): void {
      // When we open the page, the template will still be missing
    }


  

  /** Activate by the submit button of the form. */
  async onSubmitMendelian() {
    if (!this.mendelianDataForm.valid) {
      this.errorMessage = "Invalid entries in data entry form."
      return;
    }
      const diseaseId = this.mendelianDataForm.get('diseaseId')?.value;
      const diseaseName = this.mendelianDataForm.get('diseaseName')?.value;
      const cohortAcronym = this.mendelianDataForm.get('cohortAcronym')?.value;
      const hgnc = this.mendelianDataForm.get('hgnc')?.value;
      const symbol = this.mendelianDataForm.get('symbol')?.value;
      const transcript = this.mendelianDataForm.get('transcript')?.value;
      const multiText = this.mendelianDataForm.get('multiText')?.value;

      const diseaseGeneDto: DiseaseGeneDto = newMendelianTemplate(diseaseId, diseaseName, cohortAcronym, hgnc, symbol, transcript);

      console.log("Disease ID:", diseaseId);
      console.log("Disease Name:", diseaseName);
      console.log("cohortAcronym:", cohortAcronym);
      console.log("HGNC:", hgnc);
      console.log("Symbol:", symbol);
      console.log("Transcript:", transcript);
      console.log("Multi Text:", multiText);

      try {
        const template = await this.configService.createNewTemplateFromSeeds(diseaseGeneDto, multiText);
        this.templateService.setTemplate(template);
        this.showSuccessMessage = true;
      } catch (error) {
          this.errorMessage = String(error);
      }
      

      
  }


  hasError(field: string): boolean {
    return this.mendelianDataForm.controls[field].invalid && this.mendelianDataForm.controls[field].touched;
  }

  markAllFieldsAsTouched() {
    Object.keys(this.mendelianDataForm.controls).forEach(field => {
      const control = this.mendelianDataForm.get(field);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }


digenic() {
  this.mendelianTemplate = true;
  this.meldedTemplate = false;
  this.digenicTemplate = false;
}
melded() {
  this.mendelianTemplate = false;
  this.meldedTemplate = true;
  this.digenicTemplate = false;
}
mendelian() {
  this.mendelianTemplate = true;
  this.meldedTemplate = false;
  this.digenicTemplate = false;
}

}
