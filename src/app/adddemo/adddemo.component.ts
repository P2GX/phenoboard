
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import {  FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AgeInputService} from '../services/age_service';  // Adjust path if needed
import { defaultDemographDto, DemographDto} from '../models/demograph_dto'
import { asciiValidator } from '../validators/validators';
import { debounceTime } from 'rxjs';
import { MatSelectModule } from "@angular/material/select";
import { DemoFormDialogComponent } from './demoformdialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';


@Component({
  selector: 'app-adddemo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSelectModule, MatInputModule, MatFormFieldModule],
  templateUrl: './adddemo.component.html',
  styleUrls: ['./adddemo.component.css']
})
export class AdddemoComponent {

 constructor(
    public ageService: AgeInputService,
    private fb: FormBuilder,
    private dialog: MatDialog) {
      const dto: DemographDto = defaultDemographDto();
      this.demoForm = this.fb.group({
        individualId: [dto.individualId, [Validators.required, asciiValidator()]],
        ageOfOnset: [dto.ageOfOnset, Validators.required],
        ageAtLastEncounter: [dto.ageAtLastEncounter, Validators.required],
        sex: [dto.sex, Validators.required],
        deceased: [dto.deceased, Validators.required],
        comment: [dto.comment, asciiValidator()]
      });
 }

  @Output() demoSubmitted = new EventEmitter<{dto: DemographDto, hideDemo: boolean}>();


  demoForm: FormGroup;

  showCommentBox: boolean = false;
  showCommentModal: boolean = false;
  tempComment: string = '';

  allDataEntered: boolean = false;
  isValidAge: any;
  ageInput: any;
  isAscii: boolean = true;

  sexOptions = ['M', 'F', 'O', 'U'];
  deceasedOptions = ['yes', 'no', 'na'];

  @Output() dataEnteredChange = new EventEmitter<boolean>();
  ngOnInit() {
    this.demoForm.get('individualId')?.valueChanges
      .pipe(debounceTime(100))
      .subscribe(() => { /* can mark touched */ });
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

  submitDemo(hideDemographic: boolean): void {
    if (!this.demoForm.valid) {
      return;
    }
    this.allDataEntered = hideDemographic; // this controls if we see the form or not.
    this.demoSubmitted.emit({
      dto: this.demoForm.value as DemographDto,
      hideDemo: hideDemographic
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
    this.allDataEntered = false;
  }

  get selectedTerms(): string[] {
    return this.ageService.selectedTerms;
  }

  get demographicSummary(): string {
    const value = this.demoForm.value;
    if (!value.individualId) return 'not initialized';

    const age = value.ageAtLastEncounter !== 'na' ? `age: ${value.ageAtLastEncounter}` : '';
    const onset = value.ageOfOnset !== 'na' ? `onset: ${value.ageOfOnset}` : '';
    const extras = [age, onset].filter(Boolean).join(', ');

    return `Individual: ${value.individualId} (${extras}; sex: ${value.sex}; deceased?: ${value.deceased})`;
  }

  get demographicComment(): string {
    return this.demoForm.value.comment ? `comment: "${this.demoForm.value.comment}"` : '';
  }

}
