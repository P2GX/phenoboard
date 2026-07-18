import { Component, inject, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { AgeInputService } from '../services/age_service';
import { defaultDemographDto, DemographDto } from '../models/demograph_dto';
import { asciiValidator, IndividualCommentComponent } from '@workspace/ui';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { AddageComponent } from '../addages/addage.component';
import { HelpButtonComponent } from 'ng-hpo-uikit';

@Component({
  selector: 'app-adddemo',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatIcon,
    HelpButtonComponent,
  ],
  templateUrl: './adddemo.component.html',
  styleUrls: ['./adddemo.component.css'],
})
export class AdddemoComponent {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private ageService = inject(AgeInputService);

  private dialogRef = inject(MatDialogRef<AdddemoComponent>, { optional: true });
  private data = inject<{ demoDto?: DemographDto }>(MAT_DIALOG_DATA, { optional: true });
  readonly ageStrings = this.ageService.selectedTerms;
  demoSubmitted = output<{ dto: DemographDto; hideDemo: boolean }>();

  deceasedOptions: string[] = ['yes', 'no', 'na'];
  sexOptions: string[] = ['M', 'F', 'O', 'U'];

  isCommentDialogOpen = signal<boolean>(false);
  existingComment = signal<string>('Initial comment text from model state');

  demoForm: FormGroup = this.initForm();

  /* Open dialog to enter ageOfOnset or ageAtLastEncounter */
  openAgeWizard(controlName: string): void {
    const control = this.demoForm.get(controlName);
    if (!control) {
      return;
    }

    const dialogRef = this.dialog.open(AddageComponent, {
      width: '450px',
      data: { current: control?.value },
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result) {
        control.patchValue(result);
        control.markAsDirty();
        control.markAsTouched();
      }
    });
  }

  private initForm(): FormGroup {
    const dto = this.data?.demoDto ?? defaultDemographDto();

    return this.fb.group({
      individualId: [dto.individualId, [Validators.required, asciiValidator()]],
      ageOfOnset: [dto.ageOfOnset, [Validators.required, this.ageService.validator()]],
      ageAtLastEncounter: [
        dto.ageAtLastEncounter,
        [Validators.required, this.ageService.validator()],
      ],
      sex: [dto.sex, Validators.required],
      deceased: [dto.deceased, Validators.required],
      comment: [dto.comment, asciiValidator()],
    });
  }

  submitDemo(hideDemographic: boolean): void {
    if (!this.demoForm.valid) return;

    const result = {
      dto: this.demoForm.value as DemographDto,
      hideDemo: hideDemographic,
    };

    if (this.dialogRef) {
      // if used in a dialog, close and return
      this.dialogRef.close(result);
    } else {
      // if used inline, just emit
      this.demoSubmitted.emit(result);
    }
  }




  openCommentDialog() {
    this.isCommentDialogOpen.set(true);
  }

  closeCommentDialog() {
    this.isCommentDialogOpen.set(false);
  }

  onCommentSaved(updatedComment: string) {
    console.log('Received comment text from child:', updatedComment);
    this.existingComment.set(updatedComment); // Sync down to your state model
    
     this.demoForm.patchValue({ comment: this.existingComment() });
    
    this.closeCommentDialog(); // Hide the component view
  }

  cancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close(null);
    }
  }
}
