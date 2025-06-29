import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { DiseaseDto, GeneVariantBundleDto, HeaderDupletDto, IndividualDto, TemplateDto } from '../models/template_dto';
import { CohortDescriptionDto} from '../models/cohort_description_dto'
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AddagesComponent } from "../addages/addages.component";
import { IndividualEditComponent } from '../individual_edit/individual_edit.component'; // adjust path as needed
import { DiseaseEditComponent } from '../disease_edit/disease_edit.component';
import { GeneEditComponent } from '../gene_edit/gene_edit.component';
import { HpoAutocompleteComponent } from '../hpoautocomplete/hpoautocomplete.component';
import { AgeInputService } from '../services/age_service';

type Option = { label: string; value: string };

@Component({
  selector: 'app-pttemplate',
  standalone: true,
  imports: [ 
    AddagesComponent,
    HpoAutocompleteComponent,
    CommonModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
})
export class PtTemplateComponent implements OnInit {

  constructor(
    private configService: ConfigService, 
    private dialog: MatDialog,
    public ageService: AgeInputService) {}
  @ViewChild(HpoAutocompleteComponent) hpo_component!: HpoAutocompleteComponent;
  @ViewChild('addagesComponent') addagesComponent!: AddagesComponent;

  tableData: TemplateDto | null = null;
  hoveredIndividual: IndividualDto | null = null;
  hoveredDisease: DiseaseDto | null = null;
  hoveredGene: GeneVariantBundleDto | null = null;
  hoveredHpoHeader: HeaderDupletDto | null = null;
  cohortDescription: CohortDescriptionDto | null = null;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  /* used for autocomplete widget */
  hpoInputString: string = '';
  selectedHpoTerm: string = "";
  /* used for right-click option menu */
  contextMenuVisible: boolean = false;
  contextMenuX:number = 0;
  contextMenuY: number = 0;
  selectedCell: any = null;
  
  predefinedOptions: Option[] = [
    { label: 'Observed ✅', value: 'observed' },
    { label: 'Excluded ❌', value: 'excluded' },
    { label: 'N/A', value: 'na' },
    // Add more dynamically if you want
  ];
  contextMenuOptions: Option[] = [];

  ngOnInit(): void {
    console.log("PtTemplateComponent - ngInit")
    document.addEventListener('click', this.onClickAnywhere.bind(this));
    this.contextMenuOptions = [...this.predefinedOptions];
    this.loadTemplate();
  }

  loadTemplate(): void {
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


showSuccess(message: string): void {
  this.successMessage = message;
  setTimeout(() => this.successMessage = null, 5000); // hide after 5 sec
}

showError(message: string): void {
  this.errorMessage = message;
  setTimeout(() => this.errorMessage = null, 5000);
}

  submitSelectedHpo = async () => {
    await this.addHpoTermToCohort(this.selectedHpoTerm);
    
  };

  async addHpoTermToCohort(autocompletedTerm: string): Promise<void> {
    console.log("addHpoTermToCohort = ", autocompletedTerm);
    if (autocompletedTerm) {
      const [id, label] = autocompletedTerm.split('-').map(s => s.trim());
      try {
        await this.configService.addHpoToCohort(id, label);
        this.showSuccess(`Successfully added ${label} (${id})`);
        this.loadTemplate();
      } catch (err) {
        console.error(err);
        this.showError(`Failed to add term ${label} (${id})`);
      }
    }
  }

  

onRightClick(event: MouseEvent, cell: any): void {
  let ageOptions: Option[] = this.ageService.getSelectedTerms().map(item => ({ label: `${item} ✅`, value: item }));
  this.contextMenuOptions = [...this.predefinedOptions, ...ageOptions];
  event.preventDefault(); // prevent default browser menu
  this.selectedCell = cell;
  this.contextMenuVisible = true;
  this.contextMenuX = event.clientX;
  this.contextMenuY = event.clientY;
}

onMenuOptionClick(newValue: string): void {
  if (this.selectedCell) {
    this.selectedCell.value = newValue;
    // optionally emit an event or call a backend service here
  }
  this.contextMenuVisible = false;
}

onClickAnywhere(): void {
  this.contextMenuVisible = false;
}

}
