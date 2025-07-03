
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import {  FormsModule } from '@angular/forms';
import { AgeInputService} from '../services/age_service';  // Adjust path if needed
import { defaultDemographDto, DemographDto} from '../models/demograph_dto'


@Component({
  selector: 'app-adddemo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adddemo.component.html',
  styleUrl: './adddemo.component.css'
})
export class AdddemoComponent {
 constructor(public ageService: AgeInputService) {}

  demograph: DemographDto = defaultDemographDto();

  showCommentBox: boolean = false;
  showCommentModal: boolean = false;
  tempComment: string = '';

  allDataEntered: boolean = false;
  ageInput: any;
  isAscii: boolean = true;

  sexOptions = ['M', 'F', 'O', 'U'];
  deceasedOptions = ['yes', 'no', 'na'];

  @Output() dataEnteredChange = new EventEmitter<boolean>();
  ngOnInit() {
      
  }

  handleOnsetSelection($event: string) {
    throw new Error('Method not implemented.');
  }
  
  onAgeInputBlur() {
    throw new Error('Method not implemented.');
  }


  getDemograph(): DemographDto {
    
    return this.demograph;
  }
  

  onIndividualIdBlur() {
    this.demograph.individualId = this.demograph.individualId.trim();
    this.isAscii = /^[\x00-\x7F]*$/.test(this.demograph.individualId);
  }

  get selectedTerms(): string[] {
    return this.ageService.selectedTerms;
  }

  addComment() {
    this.showCommentBox = true;
  }

  openCommentDialog(): void {
    this.tempComment = this.demograph.comment;
    this.showCommentModal = true;
  }

  confirmComment(): void {
    this.demograph.comment = this.tempComment;
    this.showCommentModal = false;
  }

  cancelComment(): void {
    this.showCommentModal = false;
  }

  submitDemo(hideDemograpic: boolean) {
    if (hideDemograpic) {
      this.allDataEntered = true;
      this.dataEnteredChange.emit(hideDemograpic);
    } else {
      this.allDataEntered = false;
      this.dataEnteredChange.emit(hideDemograpic);
    }
  }

  isReady(): boolean {
    return (
      this.demograph.individualId.length > 0
    );
  }


  reset(): void {
    this.demograph = defaultDemographDto();
    this.ageService.clearSelectedTerms();
    this.allDataEntered = false;
  }

}
