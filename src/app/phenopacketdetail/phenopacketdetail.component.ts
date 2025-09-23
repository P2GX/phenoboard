import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData, RowData } from '../models/cohort_dto';
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

  observedTerms: HpoTermDuplet[] = [];
  excludedTerms: HpoTermDuplet[] = [];

  constructor(
    private route: ActivatedRoute,
    private cohortService: CohortDtoService
  ) {
    console.log("PhenopacketDetailComponent ctor")
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.row = this.cohortService.findPhenopacketById(id);
      }
    });
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
  }

}
