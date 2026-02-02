import { Component, inject, output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { AgeInputService } from '../services/age_service';
import { defaultDemographDto, DemographDto } from '../models/demograph_dto';
import { asciiValidator } from '../validators/validators';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DemoFormDialogComponent } from './demoformdialog.component';
import { MatIcon } from "@angular/material/icon";
import { AddageComponent } from '../addages/addage.component';

@Component({
  selector: 'app-adddemo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatIcon
],
  templateUrl: './adddemo.component.html',
  styleUrls: ['./adddemo.component.css']
})
export class AdddemoComponent {
  private fb =inject(FormBuilder);
  private dialog =inject(MatDialog);
  private ageService = inject(AgeInputService);

  private dialogRef = inject(MatDialogRef<AdddemoComponent>, { optional: true });
  private data = inject<{ demoDto?: DemographDto }>(MAT_DIALOG_DATA, { optional: true });
  readonly ageStrings = this.ageService.selectedTerms;
  demoSubmitted = output<{ dto: DemographDto; hideDemo: boolean }>();
  
  deceasedOptions: string[] = ["yes", "no", "na"];
  sexOptions: string[] = ['M', 'F', 'O', 'U'];

  demoForm: FormGroup = this.initForm();
  
  /* Open dialog to enter ageOfOnset or ageAtLastEncounter */
  openAgeWizard(controlName: string) {
    const control = this.demoForm.get(controlName);
    
    const dialogRef = this.dialog.open(AddageComponent, {
      width: '450px',
      data: { current: control?.value }
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result) {
        // Update the specific control passed in
        control?.patchValue(result);
        control?.markAsDirty();
        control?.markAsTouched();
      }
    });
  }

  private initForm(): FormGroup {
    const dto = this.data?.demoDto ?? defaultDemographDto();
    
    return this.fb.group({
      individualId: [dto.individualId, [Validators.required, asciiValidator()]],
      ageOfOnset: [dto.ageOfOnset, [Validators.required, this.ageService.validator()]],
      ageAtLastEncounter: [dto.ageAtLastEncounter, Validators.required],
      sex: [dto.sex, Validators.required],
      deceased: [dto.deceased, Validators.required],
      comment: [dto.comment, asciiValidator()]
    });
  }

  submitDemo(hideDemographic: boolean): void {
    if (!this.demoForm.valid) return;

    const result = {
      dto: this.demoForm.value as DemographDto,
      hideDemo: hideDemographic
    };

    if (this.dialogRef) {
      // if used in a dialog, close and return
      this.dialogRef.close(result);
    } else {
      // if used inline, just emit
      this.demoSubmitted.emit(result);
    }
  }

  openCommentDialog(): void {
    const currentValue = this.demoForm.get('comment')?.value || '';

    const dialogRef = this.dialog.open(DemoFormDialogComponent, {
      width: '400px',
      data: { comment: currentValue }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        this.demoForm.patchValue({'comment':result});
      }
    });
  }

  reset(): void {
    this.demoForm.reset({
      individualId: '',
      ageOfOnset: 'na',
      ageAtLastEncounter: 'na',
      sex: null,
      deceased: null,
      comment: ''
    });
  }

  cancel() {
    if (this.dialogRef) {
      this.dialogRef.close(null); 
    }
  }

  

}
