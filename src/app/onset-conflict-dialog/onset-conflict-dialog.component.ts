import { Component, ElementRef, ViewChild, afterNextRender, computed, input, output, signal, viewChild } from '@angular/core';
import { HpoTermDuplet } from '@workspace/ui';
import { OnsetConflict, OnsetResolution } from '../models/repo_qc';

interface Group {
  key: string; rowIndex: number; individualId: string; pmid: string;
  redundant: HpoTermDuplet; onset: string;
  candidates: { term: HpoTermDuplet; onset: string | null }[];
}

@Component({
  selector: 'app-onset-conflict-dialog',
  standalone: true,
  templateUrl: 'onset-conflict-dialog.component.html',
  styleUrl:'onset-conflict-dialog.component.scss',
})
export class OnsetConflictDialogComponent {
  conflicts = input.required<OnsetConflict[]>();
  resolved = output<OnsetResolution[]>();
  cancelled = output<void>();

  readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('onsetDialog');
  private handled = false; // true once Apply/Cancel has already emitted

  choice = signal<Record<string, string>>({});

  constructor(){
    afterNextRender(()=> {
        const el = this.dialogRef()?.nativeElement;
        if (el && !el.open) el.showModal();
    })
  }

  groups = computed<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const c of this.conflicts()) {
      const key = `${c.rowIndex}|${c.redundantTerm.hpoId}`;
      let g = map.get(key);
      if (!g) {
        g = { key, rowIndex: c.rowIndex, individualId: c.individualId, pmid: c.pmid,
              redundant: c.redundantTerm, onset: c.redundantOnset, candidates: [] };
        map.set(key, g);
      }
      g.candidates.push({ term: c.specificTerm, onset: c.specificOnset });
    }
    return [...map.values()];
  });

  allChosen = computed(() => this.groups().every(g => !!this.choice()[g.key]));

  pick(key: string, value: string) {
    this.choice.update(c => ({ ...c, [key]: value }));
  }

  apply() {
    this.handled = true;
    this.resolved.emit(this.groups().map(g => ({
      rowIndex: g.rowIndex,
      redundantTermId: g.redundant.hpoId,
      moveTo: this.choice()[g.key] === '__discard__' ? null : this.choice()[g.key],
    })));
    this.dialogRef()?.nativeElement.close();
  }

  cancel() {
    this.handled = true;
    this.cancelled.emit();
    this.dialogRef()?.nativeElement.close();
  }

  onDialogClose() {
    if (!this.handled) this.cancelled.emit();
  }
}