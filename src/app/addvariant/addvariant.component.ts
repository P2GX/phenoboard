import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule } from '@angular/forms';
import { AgeInputService } from '../services/age_service';

@Component({
  selector: 'app-addvariant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './addvariant.component.html',
  styleUrl: './addvariant.component.css'
})
export class AddVariantComponent {
  constructor(public ageService: AgeInputService){}
  

}
