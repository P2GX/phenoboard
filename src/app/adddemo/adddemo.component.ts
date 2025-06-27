
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
 constructor(public ageService: AgeInputService) {}
 
 


  availableAgeTerms: string[] = ["na"];
  ageOfOnset: string = "na";
  ageAtLastExamination: string = "na";
  allDataEntered: boolean = false;
  isValidAge: any;
  ageInput: any;
  individualId: string = '';
  isAscii: boolean = true;

  sexOptions = ['M', 'F', 'U', 'O'];
  sex: string = 'U';

  deceasedOptions = ['yes', 'no', 'na'];
  deceased = 'na';

  


  @Output() dataEnteredChange = new EventEmitter<boolean>();
  ngOnInit() {
      
  }

  handleOnsetSelection($event: string) {
    throw new Error('Method not implemented.');
  }
  
  onAgeInputBlur() {
    throw new Error('Method not implemented.');
  }


  
  

  onIndividualIdBlur() {
    this.individualId = this.individualId.trim();
    this.isAscii = /^[\x00-\x7F]*$/.test(this.individualId);
  }

  get selectedTerms(): string[] {
    return this.ageService.selectedTerms;
  }

  addComment() {
    throw new Error('Method not implemented.');
  }
  submitDemo(hideDemograpic: boolean) {
    console.log("submitDemo- hideDemograpic=", hideDemograpic)
    if (hideDemograpic) {
      this.allDataEntered = true;
      this.dataEnteredChange.emit(hideDemograpic);
    } else {
      this.allDataEntered = false;
      this.dataEnteredChange.emit(hideDemograpic);
    }
  }
}
