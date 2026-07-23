import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { HpoTermDuplet } from '../../../libs/ui/src/lib/models/hpo_term_dto';
import { MiningConcept, MiningStatus, IconComponent, SplitDialogComponent } from '@workspace/ui';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../services/config.service';
import { ClipboardModule } from '@angular/cdk/clipboard';

import {
  OntologyAutocompleteProvider,
  OntologyMatch,
  OntologyAutocompleteComponent,
  NotificationService,
} from 'ng-hpo-uikit';

/// symbols for not applicable or unknown status
const NOT_APPLICABLE = new Set([
  'na',
  'n.a.',
  'n/a',
  'nd',
  'n/d',
  'n.d.',
  '?',
  '/',
  'n.d.',
  'unknown',
]);

/* Component to map columns that contain strings representing one to many HPO terms */
@Component({
  selector: 'app-multihpo',
  standalone: true,
  templateUrl: './multihpo.component.html',
  styleUrl: './multihpo.component.scss',
  imports: [
    ClipboardModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatTooltipModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    OntologyAutocompleteComponent,
    IconComponent,
    SplitDialogComponent
],
})
export class MultiHpoComponent {
  readonly concepts = signal<MiningConcept[]>([]);
  private configService = inject(ConfigService);
  // Track which row indices are currently showing the search input field
  searchingIndices = new Set<number>();
  private dialogRef = inject(MatDialogRef<MultiHpoComponent>);
  private dialog = inject(MatDialog);
  public data = inject(MAT_DIALOG_DATA) as { concepts: MiningConcept[]; title: string };
  private notificationService = inject(NotificationService);
  title: string = this.data.title;
  hpoAutocompleteString = '';
  constructor() {
    const processed = (this.data.concepts ?? [])
      .filter((c) => {
        const text = c.originalText.toLowerCase().trim();
        return !NOT_APPLICABLE.has(text) && text.length > 0;
      })
      .map((c) => ({
        ...c,
        // Auto-confirm if terms exist
        miningStatus: c.suggestedTerms.length > 0 ? MiningStatus.Confirmed : c.miningStatus,
      }));

    this.concepts.set(processed);
  }

  autocompleteProvider: OntologyAutocompleteProvider = (query: string) =>
    this.configService.performHpoAutocomplete(query);

  handleAutocompleteSelection(conceptIndex: number, match: OntologyMatch) {
    this.addNewTerm(conceptIndex, match);
  }

  // Update a specific concept when user uses autocomplete
  updateMapping(index: number, newTerm: HpoTermDuplet) {
    this.concepts.update((list) => {
      const cloned = [...list];
      const concept = cloned[index];

      concept.suggestedTerms.push({
        id: newTerm.hpoId,
        label: newTerm.hpoLabel,
        matchedText: concept.originalText,
      });

      concept.miningStatus = MiningStatus.Confirmed;
      return cloned;
    });
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
    this.dialogRef.close();
  }

  save() {
    // Return the refined list of concepts back to processMultipleHpoColumn
    this.dialogRef.close(this.concepts());
  }

  resetMapping(index: number) {
    this.concepts.update((list) => {
      const cloned = [...list];
      cloned[index] = {
        ...cloned[index],
        miningStatus: MiningStatus.Pending,
        suggestedTerms: [],
      };
      return cloned;
    });
  }

  prepareConcepts() {
    const processed = this.data.concepts.map((c) => ({
      ...c,
      isSearching: false,
      suggestedTerms: Array.isArray(c.suggestedTerms) ? [...c.suggestedTerms] : [],
    }));

    this.concepts.set(processed);
  }

  addNewTerm(conceptIndex: number, newMatch: OntologyMatch) {
    const concept: MiningConcept = this.concepts()[conceptIndex];
    // Prevent duplicates
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

  onBlur(index: number) {
    // Only collapse if we have terms; otherwise keep search open
    if (this.concepts()[index].suggestedTerms.length > 0) {
      this.searchingIndices.delete(index);
    }
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
      .filter((s) => s.length > 0); // Allow short strings, filter empty

    if (parts.length > 1) {
      // 1. Create a typed map of what we already know to auto-fill the new rows
      const knowledgeMap = new Map<string, OntologyMatch[]>(
        currentList.map((c) => [c.originalText.toLowerCase(), c.suggestedTerms]),
      );

      // 2. Generate the new row objects
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

      // 3. Update the Signal
      this.concepts.update((old) => {
        const cloned = [...old];
        cloned.splice(index, 1, ...newConcepts);
        return cloned;
      });
    }
  }


  splitIndex = signal<number|null>(null);
  splitTargetText = signal<string|null>(null);

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
    this.  splitTargetText.set(null);
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

  async openSplitDialogOLD(index: number) {
    const concept = this.concepts()[index];

    const splitDialogRef = this.dialog.open(SplitDialogComponent, {
      width: '400px',
      data: { text: concept.originalText },
    });

    // Wait for the delimiter (e.g., ",", ".", or a custom string)
    const resultDelimiter = await firstValueFrom(splitDialogRef.afterClosed());

    if (resultDelimiter) {
      this.executeSplit(index, resultDelimiter);
    }
  }
}
