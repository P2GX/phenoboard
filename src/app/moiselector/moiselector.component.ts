import { Component, EventEmitter, Output } from "@angular/core";
import { PubmedComponent } from "../pubmed/pubmed.component";
import { FormsModule } from '@angular/forms';
import { ModeOfInheritance } from "../models/cohort_dto";
import { defaultPmidDto, PmidDto } from "../models/pmid_dto";


interface MoiTerm {
  id: string;
  label: string;
  selected: boolean;
  pmid?: string;
}

@Component({
  selector: 'app-moiselector',
  templateUrl: './moiselector.component.html',
  standalone: true,
  imports: [PubmedComponent, FormsModule],
})
export class MoiSelector {
  @Output() moiChange = new EventEmitter<ModeOfInheritance[]>();

  showMoi = true;

  pmidDto: PmidDto = defaultPmidDto();

  moiTerms: MoiTerm[] = [
    { id: 'HP:0000006', label: 'Autosomal dominant inheritance', selected: false },
    { id: 'HP:0000007', label: 'Autosomal recessive inheritance', selected: false },
    { id: 'HP:0001417', label: 'X-linked inheritance', selected: false },
    { id: 'HP:0001423', label: 'X-linked dominant inheritance', selected: false },
    { id: 'HP:0001419', label: 'X-linked recessive inheritance', selected: false },
    { id: 'HP:0001427', label: 'Mitochondrial inheritance', selected: false },
    { id: 'HP:0010984', label: 'Digenic inheritance', selected: false },
    { id: 'HP:0001450', label: 'Y-linked inheritance', selected: false },
  ];


  get selectedMoiWithPmids(): MoiTerm[] {
    return this.moiTerms.filter(m => m.selected);
  }

  confirmSelection() {
    const moiList: ModeOfInheritance[] = this.selectedMoiWithPmids.map(m => ({
      hpoId: m.id,
      hpoLabel: m.label,
      citation: m.pmid!   // `!` safe because confirmDisabled prevents empty pmid
    }));
    this.moiChange.emit(moiList);
    this.showMoi = false;
  }

  cancelSelection() {
    this.moiTerms.forEach(m => m.selected = false);
    this.moiTerms.forEach(m => delete m.pmid);
    this.showMoi = false;
  }

  get confirmDisabled(): boolean {
    return this.selectedMoiWithPmids.length === 0 || this.selectedMoiWithPmids.some(m => !m.pmid);
  }
}
