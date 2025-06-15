
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { AgeInputService} from '../services/age_service';  // Adjust path if needed



@Component({
  selector: 'app-adddemo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adddemo.component.html',
  styleUrl: './adddemo.component.css'
})
export class AdddemoComponent {
addComment() {
throw new Error('Method not implemented.');
}
submitDemo() {
throw new Error('Method not implemented.');
}
  lastExamTerm: string | null = null;
  onsetTerm: string | null = null;
  availableAgeTerms: string[] = [];

handleOnsetSelection($event: string) {
throw new Error('Method not implemented.');
}
isValidAge: any;
onAgeInputBlur() {
throw new Error('Method not implemented.');
}
ageInput: any;
  constructor(public ageService: AgeInputService) {}

  

  

  ngOnInit() {
    
  }

  individualId: string = '';
  isAscii: boolean = true;

  sexOptions = ['M', 'F', 'U', 'O'];
  sex: string = 'U';

  deceasedOptions = ['yes', 'no', 'na'];
  deceased = 'na';

  ageOfOnset: string | null = null;
  ageAtLastExamination: string | null = null;

  onIndividualIdBlur() {
    this.individualId = this.individualId.trim();
    this.isAscii = /^[\x00-\x7F]*$/.test(this.individualId);
  }

  get selectedTerms(): string[] {
    return this.ageService.selectedTerms;
  }

 
}
