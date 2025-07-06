import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule } from '@angular/forms';
import { AgeInputService } from '../services/age_service';

@Component({
  selector: 'app-addages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './addages.component.html',
  styleUrl: './addages.component.css'
})
export class AddagesComponent {
  constructor(public ageService: AgeInputService){}


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
}
