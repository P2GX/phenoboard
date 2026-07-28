import { Component, inject, signal, ElementRef, ViewChild, AfterViewInit, output, input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MiningConcept, MiningStatus, SplitDialogComponent } from '@workspace/ui';
import { ConfigService } from '../services/config.service';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { IconComponent, OntologyAutocompleteProvider, OntologyMatch, OntologyAutocompleteComponent, NotificationService } from 'ng-hpo-uikit';

const NOT_APPLICABLE = new Set([
  'na',
  'n.a.',
  'n/a',
  'nd',
  'n/d',
  'n.d.',
  '?',
  '/',
  'unknown',
]);

@Component({
  selector: 'app-multihpo',
  standalone: true,
  templateUrl: './multihpo.component.html',
  styleUrls: ['./multihpo.component.scss'],
  imports: [
    CommonModule,
    ClipboardModule,
    FormsModule,
    ReactiveFormsModule,
    OntologyAutocompleteComponent,
    IconComponent,
    SplitDialogComponent
  ],
})
export class MultiHpoComponent implements AfterViewInit {
  readonly concepts = signal<MiningConcept[]>([]);
  private configService = inject(ConfigService);
  searchingIndices = new Set<number>();
  private notificationService = inject(NotificationService);

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  readonly title = input.required<string>();
  readonly initialConcepts = input.required<MiningConcept[]>();
  readonly closed = output<MiningConcept[] | null>();

  hpoAutocompleteString = '';

  ngOnInit() {
    const conceptsData = this.initialConcepts() ?? [];
    const processed = conceptsData
      .filter((c) => {
        const text = c.originalText.toLowerCase().trim();
        return !NOT_APPLICABLE.has(text) && text.length > 0;
      })
      .map((c) => ({
        ...c,
        miningStatus: c.suggestedTerms.length > 0 ? MiningStatus.Confirmed : c.miningStatus,
      }));

    this.concepts.set(processed);
  }

  ngAfterViewInit() {
    if (this.dialogEl?.nativeElement) {
      this.dialogEl.nativeElement.showModal();
    }
  }

  autocompleteProvider: OntologyAutocompleteProvider = (query: string) =>
    this.configService.performHpoAutocomplete(query);

  handleAutocompleteSelection(conceptIndex: number, match: OntologyMatch) {
    this.addNewTerm(conceptIndex, match);
  }

  toggleConfirm(index: number) {
    this.concepts.update((list) => {
      const cloned = [...list];
      const c = cloned[index];
      c.miningStatus =
        c.miningStatus === MiningStatus.Confirmed ? MiningStatus.Pending : MiningStatus.Confirmed;
      return cloned;
    });
  }

  removeConcept(index: number) {
    this.concepts.update((list) => {
      const cloned = [...list];
      cloned.splice(index, 1);
      return cloned;
    });
  }

  cancel() {
    this.dialogEl?.nativeElement.close();
    this.closed.emit(null);
  }

  save() {
    this.dialogEl?.nativeElement.close();
    this.closed.emit(this.concepts());
  }

  addNewTerm(conceptIndex: number, newMatch: OntologyMatch) {
    const concept: MiningConcept = this.concepts()[conceptIndex];
    if (!concept.suggestedTerms.some((t) => t.id === newMatch.id)) {
      concept.suggestedTerms.push(newMatch);
    }
    concept.miningStatus = MiningStatus.Confirmed;
    this.searchingIndices.delete(conceptIndex);
  }

  removeTerm(conceptIndex: number, termIndex: number) {
    this.concepts.update((list) => {
      const cloned = [...list];
      const concept = {
        ...cloned[conceptIndex],
        suggestedTerms: [...cloned[conceptIndex].suggestedTerms],
      };
      concept.suggestedTerms.splice(termIndex, 1);
      if (concept.suggestedTerms.length === 0) {
        concept.miningStatus = MiningStatus.Pending;
      }
      cloned[conceptIndex] = concept;
      return cloned;
    });
  }

  startSearch(index: number) {
    this.searchingIndices.add(index);
  }

  private async executeSplit(index: number, delimiter: string): Promise<void> {
    const currentList = this.concepts();
    const concept = currentList[index];

    const parts = concept.originalText
      .split(delimiter)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parts.length > 1) {
      const knowledgeMap = new Map<string, OntologyMatch[]>(
        currentList.map((c) => [c.originalText.toLowerCase(), c.suggestedTerms]),
      );

      const newConcepts: MiningConcept[] = await Promise.all(
        parts.map(async (p) => {
          const lowerP = p.toLowerCase();
          let alreadyKnownTerms = knowledgeMap.get(lowerP) || [];
          if (alreadyKnownTerms.length === 0) {
            try {
              const bestMatch = await this.configService.getBestHpoMatch(p);
              if (bestMatch) {
                alreadyKnownTerms = [bestMatch];
              }
            } catch (e) {
              console.error(`Could not fetch best match for ${p}`, e);
            }
          }

          return {
            ...concept,
            originalText: p,
            suggestedTerms: [...alreadyKnownTerms],
            miningStatus:
              alreadyKnownTerms.length > 0 ? MiningStatus.Confirmed : MiningStatus.Pending,
            onsetString: null,
          };
        }),
      );

      this.concepts.update((old) => {
        const cloned = [...old];
        cloned.splice(index, 1, ...newConcepts);
        return cloned;
      });
    }
  }

  splitIndex = signal<number | null>(null);
  splitTargetText = signal<string | null>(null);

  openSplit(index: number) {
    const concept = this.concepts()[index];
    if (!concept.originalText?.trim()) {
      this.notificationService.showError('Nothing to split — text is empty.');
      return;
    }
    this.splitTargetText.set(concept.originalText);
    this.splitIndex.set(index);
  }

  protected clearSplitData() {
    this.splitIndex.set(null);
    this.splitTargetText.set(null);
  }

  onSplitApplied(delimiter: string) {
    this.splitTargetText.set(null);
    if (delimiter === '') {
      this.notificationService.showError("Cannot split on empty string");
      return;
    }
    const idx = this.splitIndex();
    if (idx !== null) {
      this.executeSplit(idx, delimiter);
    } else {
      this.notificationService.showError(`Could not perform split with idx=${idx} and delimiter=${delimiter}`);
    }
    this.clearSplitData();
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
}