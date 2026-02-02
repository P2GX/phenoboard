import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CohortDtoService } from '../services/cohort_dto_service';
import { CohortData, RowData } from '../models/cohort_dto';
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute } from '@angular/router';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { MatCard, MatCardModule } from "@angular/material/card";
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { toSignal } from '@angular/core/rxjs-interop';




@Component({
  selector: 'app-phenopacketdetail',
  templateUrl: './phenopacketdetail.component.html',
  styleUrls: ['./phenopacketdetail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCard,
    MatCardModule,
    MatListModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
]
})
export class PhenopacketDetailComponent {
  private cohortService = inject(CohortDtoService);
  private route = inject(ActivatedRoute);

  observedTerms: HpoTermDuplet[] = [];
  excludedTerms: HpoTermDuplet[] = [];


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
    this.cohort()?.diseaseList.forEach(dx => {
      map.set(dx.diseaseId, dx.diseaseLabel);
    });
    return map;
  });
 

  

  getDiseaseLabel(id: string): string {
    return this.diseaseMap().get(id) ?? id;
  }

  getOmimUrl(diseaseId: string): string | null {
    if (!diseaseId.startsWith("OMIM:")) {
      return null;
    }
    const omimNumber = diseaseId.replace("OMIM:", "");
    return `https://omim.org/entry/${omimNumber}`;
  }

  getPmidNumber(pmid: string): string  {
    if (!pmid.startsWith("PMID:")) return pmid;
    return pmid.replace("PMID:", "");
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
