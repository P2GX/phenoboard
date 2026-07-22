// adddemo.component.ts
import { Component, inject, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { AgeInputService } from '../services/age_service';
import { AddageComponent } from '../addages/addage.component';
import { defaultDemographDto, DemographDto } from '../models/demograph_dto';
import { asciiValidator, IndividualCommentComponent } from '@workspace/ui';
import { HelpButtonComponent } from 'ng-hpo-uikit';

@Component({
  selector: 'app-adddemo',
  standalone: true,
  imports: [
    AddageComponent,
    FormsModule,
    ReactiveFormsModule,
    HelpButtonComponent,
    IndividualCommentComponent,
  ],
  templateUrl: './adddemo.component.html',
  styleUrls: ['./adddemo.component.scss'],
})
export class AdddemoComponent {
  private fb = inject(FormBuilder);
  private ageService = inject(AgeInputService);

  readonly ageStrings = this.ageService.selectedTerms;
  demoSubmitted = output<{ dto: DemographDto; hideDemo: boolean }>();

  deceasedOptions: string[] = ['yes', 'no', 'na'];
  sexOptions: string[] = ['M', 'F', 'O', 'U'];

  // Signals managing visibility state transitions
  isCommentDialogOpen = signal<boolean>(false);
  existingComment = signal<string>('');

  isAgeWizardOpen = signal<boolean>(false);
  activeAgeControl = signal<AbstractControl | null>(null);

  demoForm: FormGroup = this.initForm();

  private initForm(): FormGroup {
    const dto = defaultDemographDto(); // Handled completely internally now

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

  isAgeEmpty(controlName: string): boolean {
    const value = this.demoForm.get(controlName)?.value;
    // Accounts for empty strings, null, undefined, or explicit 'na' states
    return !value || value === '' || value === 'na';
  }

  /* Age Wizard State Machine Operations */
  openAgeWizard(controlName: string): void {
    const control = this.demoForm.get(controlName);
    console.log('openAgeWizard contrl = ', control);
    if (control) {
      this.activeAgeControl.set(control);
      this.isAgeWizardOpen.set(true);
    }
  }

  closeAgeWizard(): void {
    this.isAgeWizardOpen.set(false);
    this.activeAgeControl.set(null);
  }

  onAgeWizardSaved(result: string): void {
    const control = this.activeAgeControl();
    if (control && result) {
      control.setValue(result);
      control.markAsDirty();
      control.markAsTouched();
    }
    this.closeAgeWizard();
  }

  /* Comment State Machine Operations */
  openCommentDialog(): void {
    this.existingComment.set(this.demoForm.get('comment')?.value ?? '');
    this.isCommentDialogOpen.set(true);
  }

  closeCommentDialog(): void {
    this.isCommentDialogOpen.set(false);
  }

  onCommentSaved(updatedComment: string): void {
    this.existingComment.set(updatedComment);
    this.demoForm.patchValue({ comment: updatedComment });
    this.demoForm.get('comment')?.markAsDirty();
    this.closeCommentDialog();
  }

  submitDemo(hideDemographic: boolean): void {
    if (!this.demoForm.valid) return;

    this.demoSubmitted.emit({
      dto: this.demoForm.value as DemographDto,
      hideDemo: hideDemographic,
    });
  }

  reset(): void {
    this.demoForm.reset({
      individualId: '',
      ageOfOnset: 'na',
      ageAtLastEncounter: 'na',
      sex: null,
      deceased: null,
      comment: '',
    });
  }

  cancel(): void {
    this.demoSubmitted.emit({
      dto: this.demoForm.value as DemographDto,
      hideDemo: true,
    });
  }
}
