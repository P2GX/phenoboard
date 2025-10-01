import { Component, EventEmitter, Inject, Optional, Output } from '@angular/core';
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
    ReactiveFormsModule
  ],
  templateUrl: './adddemo.component.html',
  styleUrls: ['./adddemo.component.css']
})
export class AdddemoComponent {

  @Output() demoSubmitted = new EventEmitter<{ dto: DemographDto; hideDemo: boolean }>();

  demoForm: FormGroup;


  constructor(
    public ageService: AgeInputService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    @Optional() private dialogRef?: MatDialogRef<AdddemoComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: { ageStrings?: string[]; demoDto?: DemographDto }
  ) {
    const dto: DemographDto = data?.demoDto ?? defaultDemographDto();
    this.ageStrings = data?.ageStrings ?? [];

    this.demoForm = this.fb.group({
      individualId: [dto.individualId, [Validators.required, asciiValidator()]],
      ageOfOnset: [dto.ageOfOnset, Validators.required],
      ageAtLastEncounter: [dto.ageAtLastEncounter, Validators.required],
      sex: [dto.sex, Validators.required],
      deceased: [dto.deceased, Validators.required],
      comment: [dto.comment, asciiValidator()]
    });
  }

  ageStrings: string[] = [];
  deceasedOptions: string[] = ["yes", "no", "na"];
  sexOptions: string[] = ['M', 'F', 'O', 'U'];

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
        this.demoForm.get('comment')?.setValue(result);
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
      this.dialogRef.close(null);  // will emit `null` to afterClosed()
    }
  }

}
