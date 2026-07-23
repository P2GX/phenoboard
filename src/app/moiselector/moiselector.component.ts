import {
  Component,
  computed,
  EventEmitter,
  inject,
  Output,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { PubmedComponent } from '../pubmed/pubmed.component';
import { FormsModule } from '@angular/forms';
import { ModeOfInheritance } from '../../../libs/ui/src/lib/models/cohort_dto';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';
import { PmidService } from '../services/pmid_service';
import { NotificationService } from 'ng-hpo-uikit';


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
  imports: [FormsModule, PubmedComponent],
})
export class MoiSelector {
  private notificationService = inject(NotificationService);
  private pmidService = inject(PmidService);

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

  existingPmids = computed(() => {
    const allDtos = this.pmidService.pmidsSignal();
    const stringIds = allDtos.map((dto) => dto.pmid).filter((id) => !!id);
    return [...new Set(stringIds)];
  });

  selectedMoiWithPmids = computed(() => this.moiTerms().filter((m) => m.selected));

  confirmSelection(): void {
    const moiList: ModeOfInheritance[] = this.selectedMoiWithPmids().map((m) => ({
      hpoId: m.id,
      hpoLabel: m.label,
      citation: m.pmid!,
    }));
    this.moiChange.emit(moiList);
    this.showMoi.set(false);
  }

  cancelSelection(): void {
    this.moiTerms.update((current) =>
      current.map((m) => ({ ...m, selected: false, pmid: undefined })),
    );
    this.showMoi.set(false);
  }

  get confirmDisabled(): boolean {
    const selected = this.selectedMoiWithPmids();
    return selected.length === 0 || selected.some((m) => !m.pmid);
  }

  // Explicitly assign an existing PMID to an inheritance term
  selectExistingPmid(moi: MoiTerm, pmid: string): void {
    this.moiTerms.update((current) =>
      current.map((m) => (m.id === moi.id ? { ...m, selected: true, pmid: pmid } : m)),
    );
    const moiList: ModeOfInheritance[] = this.selectedMoiWithPmids().map((m) => ({
      hpoId: m.id,
      hpoLabel: m.label,
      citation: m.pmid!,
    }));
    this.moiChange.emit(moiList);
    this.showMoi.set(false);
  }


  openPmid = signal(false);
  currentMoi = signal<MoiTerm | null>(null);
  pmidDialogInitialData = signal<PmidDto | null>(null);

  openPubmedDialog(moi: MoiTerm): void {
    this.currentMoi.set(moi);
    this.pmidDialogInitialData.set(this.pmidDto());
    this.openPmid.set(true);
  }

  handleClosePmidDialog(dto: PmidDto | null) {
    this.openPmid.set(false);
    if (!dto) {
      this.notificationService.showError('Could not retrieve PubMed data');
      return;
    }
    const moi = this.currentMoi();
    if (!moi) {
      this.notificationService.showError('Cannot add PubMed data because moi is not set');
      return;
    }
    this.pmidDto.set(dto);
    this.moiTerms.update((current) =>
      current.map((m) => (m.id === moi.id ? { ...m, selected: true, pmid: dto.pmid } : m)),
    );
  }
}
