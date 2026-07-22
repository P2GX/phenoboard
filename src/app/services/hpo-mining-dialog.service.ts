import { Injectable, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';

import { ConfigService } from './config.service';
import { HierarchyMapItem, HpoTwostepData, PolishedHpoAnnotation } from 'ng-hpo-uikit';
import { HpoDialogWrapperComponent } from '../util/hpo-dialog-wrapper.component';
import { HpoTermData, toCellValue } from '@workspace/ui';

@Injectable({
  providedIn: 'root',
})
export class HpoMiningDialogService {
  private dialog = inject(MatDialog);
  private configService = inject(ConfigService);

  protected hierarchyCache = signal<Record<string, HierarchyMapItem>>({});
  fetchHpoHierarchy = (termId: string): Promise<HierarchyMapItem> => {
    const cached = this.hierarchyCache()[termId];
    if (cached) {
      return Promise.resolve(cached);
    }
    return this.configService.getHpoParentAndChildrenTerms(termId).then((data) => {
      this.hierarchyCache.update((cache) => ({ ...cache, [termId]: data }));
      return data;
    });
  };

  /**
   * Opens the high-throughput HPO two-step text mining and validation wizard.
   * Immutably updates the underlying table state upon confirmation.
   */
  openHpoTwoStepDialog(): Observable<HpoTermData[] | null> {
    const dialogData: HpoTwostepData = {
      mineTextProvider: (text: string) => this.configService.mineClinicalText(text),
      autocompleteProvider: (query: string) => this.configService.performHpoAutocomplete(query),
      hierarchyProvider: (termId: string) => this.fetchHpoHierarchy(termId),
      availableModifiers: () => this.configService.getHpoModifiers(),
    };

    const dialogRef = this.dialog.open(HpoDialogWrapperComponent, {
      width: '85vw',
      maxWidth: '1200px',
      height: '80vh',
      disableClose: true,
      data: dialogData,
    });

    return dialogRef.afterClosed().pipe(
      map((polishedAnnotations?: PolishedHpoAnnotation[]) => {
        if (!polishedAnnotations) return null;

        return polishedAnnotations.map((pa) => ({
          termDuplet: {
            hpoLabel: pa.label,
            hpoId: pa.termId,
          },
          entry: toCellValue(pa),
        }));
      }),
    );
  }
}
