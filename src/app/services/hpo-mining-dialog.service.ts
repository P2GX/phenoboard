import {
  Injectable,
  inject,
  signal,
  EnvironmentInjector,
  ApplicationRef,
  createComponent,
} from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from './config.service';
import { HierarchyMapItem, HpoTwostepData, PolishedHpoAnnotation } from 'ng-hpo-uikit';
import { HpoDialogWrapperComponent } from '../util/hpo-dialog-wrapper/hpo-dialog-wrapper.component';
import { HpoTermData, toCellValue } from '@workspace/ui';

@Injectable({
  providedIn: 'root',
})
export class HpoMiningDialogService {
  private environmentInjector = inject(EnvironmentInjector);
  private appRef = inject(ApplicationRef);
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

    return new Observable<HpoTermData[] | null>((subscriber) => {
      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);

      const componentRef = createComponent(HpoDialogWrapperComponent, {
        environmentInjector: this.environmentInjector,
        hostElement,
      });

      componentRef.setInput('dialogData', dialogData);
      this.appRef.attachView(componentRef.hostView);

      const cleanup = () => {
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        hostElement.remove();
      };

      const subscription = componentRef.instance.result.subscribe(
        (polishedAnnotations?: PolishedHpoAnnotation[]) => {
          if (!polishedAnnotations) {
            subscriber.next(null);
          } else {
            subscriber.next(
              polishedAnnotations.map((pa) => ({
                termDuplet: {
                  hpoLabel: pa.label,
                  hpoId: pa.termId,
                },
                entry: toCellValue(pa),
              })),
            );
          }
          subscriber.complete();
          cleanup();
        },
      );

      return () => {
        subscription.unsubscribe();
        cleanup();
      };
    });
  }
}