import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { CellDto, DiseaseDto, GeneVariantBundleDto, HeaderDupletDto, IndividualDto, TemplateDto } from '../models/template_dto';
import { CohortDescriptionDto} from '../models/cohort_description_dto'
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AddagesComponent } from "../addages/addages.component";
import { IndividualEditComponent } from '../individual_edit/individual_edit.component'; // adjust path as needed
import { DiseaseEditComponent } from '../disease_edit/disease_edit.component';
import { GeneEditComponent } from '../gene_edit/gene_edit.component';
import { HpoAutocompleteComponent } from '../hpoautocomplete/hpoautocomplete.component';
import { AgeInputService } from '../services/age_service';
import { TemplateDtoService } from '../services/template_dto_service';

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
    public ageService: AgeInputService,
    private templateService: TemplateDtoService) {}
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
  pendingHpoIndex: number | null = null;
  focusedHpoIndex: number | null = null;
  hpoFocusRange = 0; // number of columns to each side
  
  predefinedOptions: Option[] = [
    { label: 'Observed ✅', value: 'observed' },
    { label: 'Excluded ❌', value: 'excluded' },
    { label: 'N/A', value: 'na' },
    // Add more dynamically if you want
  ];

  focusOptions = [
    { label: 'Focus on this column', value: 'focus-0' },
    { label: 'Focus on this column ±2', value: 'focus-2' },
    { label: 'Focus on this column ±5', value: 'focus-5' },
    { label: 'Focus on this column ±10', value: 'focus-10' },
    { label: 'Show all columns', value: 'focus-reset' }
  ];

  contextMenuOptions: Option[] = [];

  ngOnInit(): void {
    console.log("PtTemplateComponent - ngInit")
    document.addEventListener('click', this.onClickAnywhere.bind(this));
    this.contextMenuOptions = [...this.predefinedOptions];
    this.loadTemplate();
    this.templateService.template$.subscribe(template => {
      this.tableData = template;
    });
  }

  loadTemplate(): void {
    this.configService.getPhetoolsTemplate().then((data: TemplateDto) => {
      this.templateService.setTemplate(data);
      this.cohortDescription = this.generateCohortDescriptionDto(data);
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
    const template = this.templateService.getTemplate();
    if (template == null) {
      console.error("Attempt to add HPO Term to cohort but template is null");
      return;
    }
    if (autocompletedTerm) {
      const [id, label] = autocompletedTerm.split('-').map(s => s.trim());
      try {
        await this.configService.addHpoToCohort(id, label, template);
        this.showSuccess(`Successfully added ${label} (${id})`);
        this.loadTemplate();
      } catch (err) {
        console.error(err);
        this.showError(`Failed to add term ${label} (${id})`);
      }
    }
  }

  

  onRightClick(event: MouseEvent, hpoColumnIndex: number, cell: CellDto) {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.pendingHpoIndex = hpoColumnIndex;
    this.selectedCell = cell;
    this.contextMenuOptions = [
      ...this.predefinedOptions,
      ...this.ageService.getSelectedTerms().map(term => ({
          label: term,
          value: term
        })),
      { label: '---', value: 'separator' },
      ...this.focusOptions,
  ];
  }

  shouldDisplayHpoColumn(index: number): boolean {
    if (this.focusedHpoIndex === null) return true;
    return (
      index >= this.focusedHpoIndex - this.hpoFocusRange &&
      index <= this.focusedHpoIndex + this.hpoFocusRange
    );
  }

  onMenuOptionClick(option: string): void {
    console.log("onMenuOptionClick option=",option);
    if (option.startsWith('focus')) {
      const parts = option.split('-');
      if (parts[1] === 'reset') {
        this.focusedHpoIndex = null;
        this.hpoFocusRange = 0;
      } else {
        this.focusedHpoIndex = this.pendingHpoIndex;
        this.hpoFocusRange = parseInt(parts[1], 10);
      }
    } else if (this.selectedCell) {
      // if we get here, then the option is 'observed', 'na', 'P4M', etc
      this.focusedHpoIndex = null;
      this.selectedCell.value = option;
    } 
    this.pendingHpoIndex = null;
    this.contextMenuVisible = false;
  }

  onClickAnywhere(): void {
    this.contextMenuVisible = false;
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuVisible = false;
  }
}
