import { Component, ElementRef, ViewChild, AfterViewInit, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hpo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multihpo-dialog-vis-component.html',
  styleUrl: './multihpo-dialog-vis-component.scss',
})
export class MultipleHpoDialogComponent implements AfterViewInit {
  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  entries: { hpoId: string; label: string; status: 'observed' | 'excluded' }[] = [];
  private originalEntries: typeof this.entries = [];
  editMode = false;

  readonly closed = output<any[] | null>();

  ngAfterViewInit() {
    if (this.dialogEl?.nativeElement) {
      this.dialogEl.nativeElement.showModal();
    }
  }

  toggleEdit() {
    if (!this.editMode) {
      this.originalEntries = this.entries.map((e) => ({ ...e }));
      this.editMode = true;
    } else {
      this.entries = this.originalEntries.map((e) => ({ ...e }));
      this.editMode = false;
    }
  }

  onCancel() {
    this.dialogEl?.nativeElement.close();
    this.closed.emit(null);
  }

  onSave() {
    this.dialogEl?.nativeElement.close();
    this.closed.emit(this.entries);
  }
}