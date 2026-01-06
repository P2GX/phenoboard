import { Component, computed, EventEmitter, inject, OnChanges, Output, signal, SimpleChanges, WritableSignal } from "@angular/core";
import { PubmedComponent } from "../pubmed/pubmed.component";
import { FormsModule } from '@angular/forms';
import { ModeOfInheritance } from "../models/cohort_dto";
import { defaultPmidDto, PmidDto } from "../models/pmid_dto";
import { MatDialog } from "@angular/material/dialog";


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
  imports: [FormsModule],
})
export class MoiSelector implements OnChanges{
  private dialog = inject(MatDialog);

  @Output() moiChange = new EventEmitter<ModeOfInheritance[]>();

  showMoi: WritableSignal<boolean> = signal(true);
  pmidDto: WritableSignal<PmidDto> = signal(defaultPmidDto());
  moiTerms: WritableSignal<MoiTerm[]> = signal([
    { id: 'HP:0000006', label: 'Autosomal dominant inheritance', selected: false },
    { id: 'HP:0000007', label: 'Autosomal recessive inheritance', selected: false },
    { id: 'HP:0001417', label: 'X-linked inheritance', selected: false },
    { id: 'HP:0001423', label: 'X-linked dominant inheritance', selected: false },
    { id: 'HP:0001419', label: 'X-linked recessive inheritance', selected: false },
    { id: 'HP:0001427', label: 'Mitochondrial inheritance', selected: false },
    { id: 'HP:0010984', label: 'Digenic inheritance', selected: false },
    { id: 'HP:0001450', label: 'Y-linked inheritance', selected: false },
    { id: 'HP:0034340', label: 'Pseudoautosomal dominant inheritance', selected: false },
    { id: 'HP:0034341', label: 'Pseudoautosomal recessive inheritance', selected: false },
  ]);

  // Watch for changes to pmidDto
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pmidDto'] && changes['pmidDto'].currentValue) {
      this.confirmSelection();
    }
  }


  selectedMoiWithPmids = computed(() =>
    this.moiTerms().filter(m => m.selected)
  );
  

  confirmSelection(): void {
    const moiList: ModeOfInheritance[] = this.selectedMoiWithPmids().map(m => ({
      hpoId: m.id,
      hpoLabel: m.label,
      citation: m.pmid!   // `!` safe because confirmDisabled prevents empty pmid
    }));
    this.moiChange.emit(moiList);
    this.showMoi.set(false);
  }

  cancelSelection(): void {
    this.moiTerms.update(current =>
      current.map(m => ({ ...m, selected: false, pmid: undefined }))
    );
    this.showMoi.set(false);
  }

  get confirmDisabled(): boolean {
    const selected = this.selectedMoiWithPmids();
    return selected.length === 0 || selected.some(m => !m.pmid);
  }


openPubmedDialog(moi: MoiTerm): void {
  const dialogRef = this.dialog.open(PubmedComponent, {
      width: '600px',
      data: { pmidDto: null } // optional initial data
    });

    dialogRef.afterClosed().subscribe((result: PmidDto | null) => {
      if (result) {
        console.log('User chose', result);
        this.pmidDto.set(result);
        this.moiTerms.update(current =>
          current.map(m =>
            m.id === moi.id ? { ...m, selected: true, pmid: result.pmid } : m
          )
        );
      } else {
        console.log('User cancelled');
      }
    });
  }


}
