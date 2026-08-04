import { Component, ElementRef, afterNextRender, input, output, viewChild, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IndividualData } from '../../../libs/ui/src/lib/models/cohort_dto';
import { AgeService } from 'ng-hpo-uikit';

@Component({
  selector: 'app-individual-edit',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './individual_edit.component.html',
})
export class IndividualEditComponent implements OnInit{
  data = input.required<IndividualData>();
  saved = output<IndividualData | null>();

  private fb = inject(FormBuilder);
  public ageInputService = inject(AgeService);

  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('nativeDialog');
  private emitted = false;

  form!: FormGroup;

  constructor() {
    afterNextRender(() => {
      this.dialogEl().nativeElement.showModal();
    });
  }

  ngOnInit() {
    const d = this.data();
    this.form = this.fb.group({
      pmid: [d.pmid, Validators.required],
      title: [d.title, Validators.required],
      individualId: [d.individualId, Validators.required],
      comment: [d.comment],
      ageOfOnset: [d.ageOfOnset, [Validators.required, this.ageInputService.validator()]],
      ageAtLastEncounter: [
        d.ageAtLastEncounter,
        [Validators.required, this.ageInputService.validator()],
      ],
      deceased: [d.deceased, Validators.required],
      sex: [d.sex, Validators.required],
    });

    this.form.get('individualId')?.valueChanges.subscribe((value) => {
      if (value !== value?.trim()) {
        this.form.get('individualId')?.setValue(value.trim(), { emitEvent: false });
      }
    });

    afterNextRender(() => {
      this.dialogEl().nativeElement.showModal();
    });
  }

  save(): void {
    if (this.form.valid) {
      this.close(this.form.value);
    }
  }

  cancel(): void {
    this.close(null);
  }

  private close(result: IndividualData | null): void {
    // stash result so onNativeClose (which fires for every close path) can find it
    this.pendingResult = result;
    this.dialogEl().nativeElement.close();
  }

  private pendingResult: IndividualData | null = null;

  /** Fires for button-triggered close AND Escape/native close alike. */
  onNativeClose(): void {
    if (this.emitted) return;
    this.emitted = true;
    this.saved.emit(this.pendingResult);
  }
}