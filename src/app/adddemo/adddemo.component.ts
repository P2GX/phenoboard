
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

  @Output() demoSubmitted = new EventEmitter<{dto: DemographDto, hideDemo: boolean}>();
  

  demograph: DemographDto = defaultDemographDto();

  showCommentBox: boolean = false;
  showCommentModal: boolean = false;
  tempComment: string = '';

  allDataEntered: boolean = false;
  isValidAge: any;
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

  /** Emit the demographic to the parent component. */
  submitDemo(hideDemographic: boolean) {
    if (hideDemographic) {
      this.allDataEntered = true;
    } else {
      this.allDataEntered = false;
    }
    this.demoSubmitted.emit({
      dto: this.demograph,
      hideDemo: hideDemographic
    });
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

  get demographicSummary(): string {
    const id = this.demograph.individualId;
    const onst = this.demograph.ageOfOnset;
    const encounter = this.demograph.ageAtLastEncounter;
    const s = this.demograph.sex;
    const deceased = this.demograph.deceased;
    if (id == "") {
      return "not initialized";
    }
    const smry = `Individual: ${id} (age: ${encounter}, onset: ${onst}; sex: ${s}; deceased?: ${deceased})`
    return smry
  }

  get demographicComment(): string {
     const comment = this.demograph.comment;
     if (comment == '') {
      return '';
     } else {
      return `comment: "${comment}"`
     }
  }

  isInitialized(): boolean {
    return this.demograph.individualId != '';
  }

}
