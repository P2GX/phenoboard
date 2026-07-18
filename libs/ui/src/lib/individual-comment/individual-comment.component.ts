// demoformdialog.component.ts
import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { asciiValidator } from '../validators/validators';

@Component({
  selector: 'lib-individual-comment-dialog',
  standalone: true,
  imports: [ReactiveFormsModule], // All Material modules dropped
  templateUrl: './individual-comment.component.html',
  styleUrl: './individual-comment.component.scss'
})
export class IndividualCommentComponent {
  // Pass initial value down via a Signal input
  comment = input<string>('');
  
  // Emit actions back up to the parent layer to close or handle save actions
  saved = output<string>();
  cancelled = output<void>();

  commentControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [asciiValidator()]
  });

  constructor() {
    // Sync initial incoming comment to the form control
    const unwrapComment = this.comment();
    if (unwrapComment) {
      this.commentControl.setValue(unwrapComment);
    }
  }

  save(): void {
    if (this.commentControl.valid) {
      this.saved.emit(this.commentControl.value);
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }
}