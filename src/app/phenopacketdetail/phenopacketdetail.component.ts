import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CohortDtoService } from '../services/cohort_dto_service';
import { CohortData, RowData } from '../models/cohort_dto';
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute } from '@angular/router';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { MatCard, MatCardModule } from "@angular/material/card";
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';




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
export class PhenopacketDetailComponent implements OnInit {
  row?: RowData;
  cohort: CohortData|null = null;

  observedTerms: HpoTermDuplet[] = [];
  excludedTerms: HpoTermDuplet[] = [];
  diseaseIdToLabel: Map<string, string> = new Map();
  constructor(
    private route: ActivatedRoute,
    private cohortService: CohortDtoService
  ) {
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.row = this.cohortService.findPhenopacketById(id);
        const cohort = this.cohortService.getCohortData();
      if (! cohort ) {
        return;
      }
      const row = this.row;
      if (! row) {
        return;
      }
      cohort.hpoHeaders.forEach((hpo, idx) => {
          const cellVal = row.hpoData[idx];
          if (cellVal.type === 'Observed') {
            this.observedTerms.push(hpo);
          } else if (cellVal.type === "OnsetAge") {
            this.observedTerms.push(hpo); // TODO - special treatment for onset/modifier terms
          } else if (cellVal.type === 'Excluded') {
            this.excludedTerms.push(hpo);
          }
        });
      cohort.diseaseList.forEach((dx, idx) => {
        this.diseaseIdToLabel.set(dx.diseaseId, dx.diseaseLabel);
      });
      }
    });
    this.cohort = this.cohortService.getCohortData();
  }

  getDiseaseLabel(id: string): string {
    return this.diseaseIdToLabel.get(id) ?? id;
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
    if (this.cohort == null) {
      return v;
    } else if (this.cohort.hgvsVariants[v] != null) {
      const hgvs = this.cohort.hgvsVariants[v].hgvs;
      const transcript = this.cohort.hgvsVariants[v].transcript;
      const symbol = this.cohort.hgvsVariants[v].symbol;
      return `${transcript}(${symbol}):${hgvs}`;
    } else if (this.cohort.structuralVariants[v] != null) {
      return this.cohort.structuralVariants[v].label;
    } else {
      return v;
    }
  }

}
