import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { DiseaseDto, GeneVariantBundleDto, HeaderDupletDto, IndividualDto, TemplateDto } from '../models/template_dto';
import { CohortDescriptionDto} from '../models/cohort_description_dto'
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { IndividualEditComponent } from '../individual_edit/individual_edit.component'; // adjust path as needed
import { DiseaseEditComponent } from '../disease_edit/disease_edit.component';
import { GeneEditComponent } from '../gene_edit/gene_edit.component';
import { HpoAutocompleteComponent } from '../hpoautocomplete/hpoautocomplete.component';


@Component({
  selector: 'app-pttemplate',
  standalone: true,
  imports: [ CommonModule,
    HpoAutocompleteComponent,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
})
export class PtTemplateComponent implements OnInit {

  constructor(private configService: ConfigService, private dialog: MatDialog) {}
  @ViewChild(HpoAutocompleteComponent) hpo_component!: HpoAutocompleteComponent;

  tableData: TemplateDto | null = null;
  hoveredIndividual: IndividualDto | null = null;
  hoveredDisease: DiseaseDto | null = null;
  hoveredGene: GeneVariantBundleDto | null = null;
  hoveredHpoHeader: HeaderDupletDto | null = null;
  cohortDescription: CohortDescriptionDto | null = null;

  /* used for autocomplete widget */
  hpoInputString: string = '';
  selectedHpoTerm: string = "";

  ngOnInit(): void {
    console.log("PtTemplateComponent - ngInit")
    this.configService.getPhetoolsTemplate().then((data: TemplateDto) => {
      this.tableData = data;
      this.cohortDescription = this.generateCohortDescriptionDto(data);
      
      
      console.log(data);
      console.log('Row example:', data.rows[0]);
    });
  }


openIndividualEditor(individual: IndividualDto) {
  const dialogRef = this.dialog.open(IndividualEditComponent, {
    width: '500px',
    data: { ...individual }, // pass a copy
  });

  dialogRef.afterClosed().subscribe((result: IndividualDto | null) => {
    if (result) {
      // Apply changes back to the original
      Object.assign(individual, result);
      // Optional: trigger change detection or save to backend
    }
  });
}



openDiseaseEditor(disease: DiseaseDto) {
  const dialogRef = this.dialog.open(DiseaseEditComponent, {
    width: '500px',
    data: { ...disease }, // pass a copy
  });

  dialogRef.afterClosed().subscribe((result: DiseaseDto | null) => {
    if (result) {
      // Apply changes back to the original
      Object.assign(disease, result);
      // Optional: trigger change detection or save to backend
    }
  });
}
  
  openGeneEditor(gene: GeneVariantBundleDto) {
    const dialogRef = this.dialog.open(GeneEditComponent, {
      width: '500px',
      data: { ...gene }, // pass a copy
    });

    dialogRef.afterClosed().subscribe((result: DiseaseDto | null) => {
      if (result) {
        // Apply changes back to the original
        Object.assign(gene, result);
        // Optional: trigger change detection or save to backend
      }
    });
  }


  generateCohortDescriptionDto(tableData: TemplateDto): CohortDescriptionDto | null {
    const row = tableData.rows[0];
    const disease = row?.diseaseDtoList?.[0];
    const gene = row?.geneVarDtoList?.[0];

    let diseaseDatabase = 'N/A';
    let diseaseId = 'N/A';

    if (disease?.diseaseId?.includes(':')) {
      [diseaseDatabase, diseaseId] = disease.diseaseId.split(':');
    }

    return {
      cohortType: tableData.cohortType,
      numIndividuals: tableData.rows.length,
      numHpos: tableData.hpoHeaders.length,
      diseaseLabel: disease?.diseaseLabel || 'N/A',
      diseaseId: diseaseId,
      diseaseDatabase,
      geneSymbol: gene?.geneSymbol || 'N/A',
      hgncId: gene?.hgncId || 'N/A',
      transcript: gene?.transcript || 'N/A',
    };
  }

  async validateCohort() {
    console.log("validate")
    if (this.tableData == null) {
      // TODO error warning
      return;
    }
    try {
      await this.configService.validateCohort(this.tableData);
      alert('✅ Cohort is valid!');
    } catch (err: any) {
      // If the Rust command returns a ValidationErrors struct
      alert('❌ Validation failed:\n' + JSON.stringify(err));
    }
  }

}
