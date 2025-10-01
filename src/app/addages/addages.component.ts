import { Component, EventEmitter, Output, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgeInputService } from '../services/age_service';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogModule } from '@angular/material/dialog';


@Component({
  selector: 'app-addages',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogActions, MatDialogModule],
  templateUrl: './addages.component.html',
  styleUrl: './addages.component.css'
})
export class AddagesComponent {
  constructor(
    public ageService: AgeInputService,
    public dialogRef: MatDialogRef<AddagesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any){ }


  ageInput = ''; //new FormControl('');
  isoPattern = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?$/;  // ISO8601 partial matcher


  @Output() ageEntries = new EventEmitter<string[]>();
  entries: string[] = [];

  addAge(): void {
    const val = this.ageInput.trim();
    if (!val) return;

    if (this.ageService.validateAgeInput(val)) {
      this.entries.push(val);
      this.ageEntries.emit(this.entries);
      this.ageService.setSelectedTerms(this.entries);
      this.ageInput = ''; // reset
    } else {
      alert('Invalid input. Please select a valid HPO age or ISO8601 string.');
    }
  }

  removeAge(index: number): void {
    this.entries.splice(index, 1);
    this.ageEntries.emit(this.entries);
    this.ageService.setSelectedTerms(this.entries);
  }

  handleAgeList($event: string[]) {
    throw new Error('Method not implemented.');
  }

  getEntries(): string[] {
    return this.entries;
  }

  reset(): void {
    this.entries = [];
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    // return some value
    this.dialogRef.close(this.entries);
  }
}
