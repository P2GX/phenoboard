import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { CohortDtoService } from '../services/cohort_dto_service';
import { CohortData } from '../../../libs/ui/src/lib/models/cohort_dto';
import { ActivatedRoute } from '@angular/router';
import { HpoTermDuplet } from '../../../libs/ui/src/lib/models/hpo_term_dto';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from "ng-hpo-uikit";

@Component({
  selector: 'app-phenopacketdetail',
  templateUrl: './phenopacketdetail.component.html',
  styleUrls: ['./phenopacketdetail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IconComponent
  ],
})
export class PhenopacketDetailComponent {
  private cohortService = inject(CohortDtoService);
  private route = inject(ActivatedRoute);

  private params = toSignal(this.route.paramMap);
  readonly id = computed(() => this.params()?.get('id'));
  readonly cohort = signal<CohortData | null>(this.cohortService.getCohortData());
  readonly row = computed(() => {
    const currentId = this.id();
    return currentId ? this.cohortService.findPhenopacketById(currentId) : undefined;
  });

  readonly terms = computed(() => {
    const row = this.row();
    const cohort = this.cohort();

    const observed: HpoTermDuplet[] = [];
    const excluded: HpoTermDuplet[] = [];

    if (row && cohort) {
      cohort.hpoHeaders.forEach((hpo, idx) => {
        const cellVal = row.hpoData[idx];
        if (cellVal.type === 'Observed' || cellVal.type === 'OnsetAge') {
          observed.push(hpo);
        } else if (cellVal.type === 'Excluded') {
          excluded.push(hpo);
        }
      });
    }

    return { observed, excluded };
  });

  readonly diseaseMap = computed(() => {
    const map = new Map<string, string>();
    this.cohort()?.diseaseList.forEach((dx) => {
      map.set(dx.diseaseId, dx.diseaseLabel);
    });
    return map;
  });

  getDiseaseLabel(id: string): string {
    return this.diseaseMap().get(id) ?? id;
  }

  getOmimUrl(diseaseId: string): string | null {
    if (!diseaseId.startsWith('OMIM:')) {
      return null;
    }
    const omimNumber = diseaseId.replace('OMIM:', '');
    return `https://omim.org/entry/${omimNumber}`;
  }

  getPmidNumber(pmid: string): string {
    if (!pmid.startsWith('PMID:')) return pmid;
    return pmid.replace('PMID:', '');
  }

  getVariantString(v: string): string {
    const cohort = this.cohort();
    if (!cohort) return v;

    if (cohort.hgvsVariants[v]) {
      const { hgvs, transcript, symbol } = cohort.hgvsVariants[v];
      return `${transcript}(${symbol}):${hgvs}`;
    }

    return cohort.structuralVariants[v]?.label ?? v;
  }
}