import { ClinicalStatus, MappedTerm, MinedCell } from '@workspace/ui';
import { Component, computed, output, input, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { IconComponent } from 'ng-hpo-uikit';
import { ask } from '@tauri-apps/plugin-dialog';
import { MinedCellEditorComponent } from './mined-cell-editor.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cell-review',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MinedCellEditorComponent,
    IconComponent
  ],
  templateUrl: './cellreview.component.html',
  styleUrls: ['./cellreview.component.scss'],
})
export class CellReviewComponent implements AfterViewInit {
  readonly update = output<MinedCell>();
  readonly closed = output<MinedCell[] | null>();

  readonly data = input.required<{
    minedCells: MinedCell[];
    title: string;
  }>();

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  currentIndex = signal(0);
  allMinedCells = signal<MinedCell[]>([]);

  ngOnInit() {
    if (this.data()?.minedCells) {
      this.allMinedCells.set(this.data().minedCells);
    }
  }

  ngAfterViewInit() {
    if (this.dialogEl?.nativeElement) {
      this.dialogEl.nativeElement.showModal();
    }
  }

  readonly currentCell = computed(() => {
    return this.allMinedCells()[this.currentIndex()];
  });

  readonly allAvailableTerms = computed(() => {
    const termsMap = new Map<string, { id: string; label: string }>();
    this.allMinedCells().forEach((cell) => {
      cell.mappedTermList?.forEach((term) => {
        termsMap.set(term.hpoId, { id: term.hpoId, label: term.hpoLabel });
      });
    });
    return Array.from(termsMap.values());
  });

  readonly termsToExclude = computed(() => {
    const cell = this.currentCell();
    if (!cell || !cell.mappedTermList) {
      return this.allAvailableTerms();
    }
    const currentCellIds = new Set(cell.mappedTermList.map((t) => t.hpoId));
    return this.allAvailableTerms().filter((t) => !currentCellIds.has(t.id));
  });

  next(): void {
    if (this.currentIndex() < this.allMinedCells().length - 1) {
      this.currentIndex.update((i) => i + 1);
    } else {
      this.dialogEl?.nativeElement.close();
      this.closed.emit(this.allMinedCells());
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
    }
  }

  handleCellChange(updatedCell: MinedCell): void {
    this.allMinedCells.update((cells) =>
      cells.map((c, idx) => (idx === this.currentIndex() ? updatedCell : c)),
    );
  }

  async onCancel(): Promise<void> {
    const confirmExit = await ask('Discard changes?', {
      title: 'Confirm Exit',
      kind: 'warning',
      okLabel: 'Discard',
      cancelLabel: 'Stay here',
    });

    if (confirmExit) {
      this.dialogEl?.nativeElement.close();
      this.closed.emit(null);
    }
  }

  handleExcludeTerm(term: { id: string; label: string }): void {
    this.allMinedCells.update((cells) => {
      const newCells = [...cells];
      const current = newCells[this.currentIndex()];

      const newExcludedTerm: MappedTerm = {
        hpoId: term.id,
        hpoLabel: term.label,
        status: ClinicalStatus.Excluded,
        onset: 'na',
      };

      current.mappedTermList = [...(current.mappedTermList || []), newExcludedTerm];
      return newCells;
    });
  }

  handleExcludeAll(): void {
    const shelf = this.termsToExclude();
    if (shelf.length === 0) return;

    this.allMinedCells.update((cells) => {
      const newCells = [...cells];
      const current = { ...newCells[this.currentIndex()] };
      const existingIds = new Set(current.mappedTermList?.map((t) => t.hpoId) || []);
      const newExclusions: MappedTerm[] = shelf
        .filter((term) => !existingIds.has(term.id))
        .map((term) => ({
          hpoId: term.id,
          hpoLabel: term.label,
          status: ClinicalStatus.Excluded,
          onset: 'na',
        }));
      current.mappedTermList = [...(current.mappedTermList || []), ...newExclusions];
      newCells[this.currentIndex()] = current;

      return newCells;
    });
  }
}