import { Component, computed, input, OnInit, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { asciiValidator } from '../validators/validators';

@Component({
  selector: 'lib-individual-comment-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './individual-comment.component.html',
  styleUrl: './individual-comment.component.scss'
})
export class IndividualCommentComponent implements OnInit {

  comment = input<string>('');
  saved = output<string>();
  cancelled = output<void>();
  editing = false;

  dialogTitle = computed(() => {
    if (this.editing) {
      return "Edit comment";
    } else {
      return "Add comment";
    }
  });

  commentControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [asciiValidator()]
  });

   ngOnInit(): void {
    const comment = this.comment();
    this.editing = comment.length > 0;
    this.commentControl.setValue(comment);
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