import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { CellValue, DiseaseDto, GeneVariantBundleDto, HeaderDupletDto, IndividualDto, CohortDto, RowDto } from '../models/cohort_dto';
import { CohortDescriptionDto} from '../models/cohort_description_dto'
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AddagesComponent } from "../addages/addages.component";
import { IndividualEditComponent } from '../individual_edit/individual_edit.component'; 
import { DiseaseEditComponent } from '../disease_edit/disease_edit.component';
import { GeneEditComponent } from '../gene_edit/gene_edit.component';
import { HpoAutocompleteComponent } from '../hpoautocomplete/hpoautocomplete.component';
import { AgeInputService } from '../services/age_service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { firstValueFrom, take } from 'rxjs';
import { NotificationService } from '../services/notification.service';


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
    MatDialogModule,
  ],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
})
export class PtTemplateComponent extends TemplateBaseComponent implements OnInit {

  constructor(
    private configService: ConfigService, 
    private dialog: MatDialog,
    public ageService: AgeInputService,
    ngZone: NgZone,
    cohortService: CohortDtoService,
    override cdRef: ChangeDetectorRef,
    private notificationService: NotificationService) {
      super(cohortService, ngZone, cdRef)
    }
  @ViewChild(HpoAutocompleteComponent) hpo_component!: HpoAutocompleteComponent;
  @ViewChild(AddagesComponent) addagesComponent!: AddagesComponent;
    Object = Object; // <-- expose global Object to template
  cohortDto: CohortDto | null = null;

  selectedCellContents: CellValue | null = null;
  cohortDescription: CohortDescriptionDto | null = null;
  successMessage: string | null = null;

  /* used for autocomplete widget */
  hpoInputString: string = '';
  selectedHpoTerm: string = "";
  /* used for right-click option menu */
  contextMenuVisible: boolean = false;
  contextMenuX:number = 0;
  contextMenuY: number = 0;
  
  pendingHpoColumnIndex: number | null = null;
  pendingHpoRowIndex: number | null = null;
  focusedHpoIndex: number | null = null;
  hpoFocusRange = 0; // number of columns to each side
  
  predefinedOptions: Option[] = [
    { label: 'Observed ✅', value: 'observed' },
    { label: 'Excluded ❌', value: 'excluded' },
    { label: 'N/A', value: 'na' },
  ];

  focusOptions = [
    { label: 'Focus on this column', value: 'focus-0' },
    { label: 'Focus on this column ±2', value: 'focus-2' },
    { label: 'Focus on this column ±5', value: 'focus-5' },
    { label: 'Focus on this column ±10', value: 'focus-10' },
    { label: 'Show all columns', value: 'focus-reset' }
  ];

  contextMenuOptions: Option[] = [];

  override ngOnInit(): void {
    console.log("PtTemplateComponent - ngInit");
    super.ngOnInit();
    this.cohortService.cohortDto$.subscribe(dto => {
      this.cohortDto = dto;
    });
    document.addEventListener('click', this.onClickAnywhere.bind(this));
    this.contextMenuOptions = [...this.predefinedOptions];
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    document.removeEventListener('click', this.onClickAnywhere.bind(this)); 
  }

  protected override onCohortDtoLoaded(cohortDto: CohortDto): void {
    console.log("✅ Template loaded into PtTemplateComponent:", cohortDto);
    this.cohortDescription = this.generateCohortDescriptionDto(cohortDto);
    this.cdRef.detectChanges();
  }

  protected override onCohortDtoMissing(): void {
    console.warn("⚠️ Template is missing in PtTemplateComponent");
  }

  /* Load the Phetools template from the backend only if the templateService 
    has not yet been initialized. */
  async loadTemplate(): Promise<void> {
    const existing = this.cohortService.getCohortDto();
    if (!existing) {
      console.log("🏗️ Loading template from backend...");
      try {
        const data = await this.configService.getPhetoolsTemplate();
        this.cohortService.setCohortDto(data); // 🟢 base class reacts here
      } catch (error) {
        console.error("❌ Failed to load template:", error);
      }
    } else {
      console.log("✅ Template already loaded");
    }
  }

  ngAfterViewInit(): void {
    this.cdRef.detectChanges(); 
  }


  async loadTemplateFromBackend(): Promise<void> {
    this.configService.getPhetoolsTemplate().then((data: CohortDto) => {
        this.cohortService.setCohortDto(data);
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
  
/**
 * Opens a dialog that allows us to edit the current gene/transcript/alleles
 * @param gene 
 */
  openGeneEditor(gene: GeneVariantBundleDto) {
    const dialogRef = this.dialog.open(GeneEditComponent, {
      width: '500px',
      data: { ...gene }, // pass a copy
    });

    dialogRef.afterClosed().subscribe((result: GeneVariantBundleDto | null) => {
      if (result) {
        // Apply changes back to the original
        Object.assign(gene, result);
        // Optional: trigger change detection or save to backend
      }
    });
  }


  generateCohortDescriptionDto(cohortDto: CohortDto | null): CohortDescriptionDto | null {
    if (cohortDto == null) {
      return null;
    }
    console.log("generateCohortDescriptionDto", cohortDto);
    const dgDto = cohortDto.diseaseGeneDto;
    if (dgDto == null) {
      alert("Could not extract Disease Gene DTO object");
      return null;
    }
    if (dgDto.diseaseDtoList.length < 1) {
      alert("Could not find Disease DTO object");
      return null;
    }
    if (dgDto.geneTranscriptDtoList.length < 1) {
      alert("Could not find GeneTrascript DTO object");
      return null;
    }
    const gt_dto = dgDto.geneTranscriptDtoList[0];
    const diseaseDto = dgDto.diseaseDtoList[0];
    const diseaseLabel = diseaseDto.diseaseLabel;
    const diseaseId = diseaseDto.diseaseId;
    
    let diseaseDatabase = 'N/A';
    let idPart = '';

    if (diseaseId.includes(':')) {
      [diseaseDatabase, idPart] = diseaseId.split(':');
    }

    return {
      cohortType: cohortDto.cohortType,
      numIndividuals: cohortDto.rows.length,
      numHpos: cohortDto.hpoHeaders.length,
      diseaseLabel: diseaseLabel,
      diseaseId: diseaseId,
      diseaseDatabase,
      geneSymbol: gt_dto.geneSymbol,
      hgncId: gt_dto.hgncId,
      transcript: gt_dto.transcript,
    };
  }

  async validateCohort() {
    console.log("validate")
    if (! this.cohortDto) {
      alert("Cohort DTO not initialized");
      return;
    }
    try {
      await this.configService.validateCohort(this.cohortDto);
      alert("✅ Cohort successfully validated");
    } catch (err: any) {
      // If the Rust command returns a ValidationErrors struct
      alert('❌ Validation failed:\n' + JSON.stringify(err));
    }
  }


  showError(err: any): void {
      let errorMessage: string;
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as any).message;
      } else {
        errorMessage = 'Unknown error occurred';
      }
       this.notificationService.showError(errorMessage);
    }

  showSuccess(msg: any): void {
      let okMessage: string;
      if (msg instanceof Error) {
        okMessage = msg.message;
      } else if (typeof msg === 'string') {
        okMessage = msg;
      } else if (msg && typeof msg === 'object' && 'message' in msg) {
        okMessage = (msg as any).message;
      } else {
        okMessage = 'Success';
      }
        this.notificationService.showSuccess(`✅ ${okMessage}`);
    }

  submitSelectedHpo = async () => {
    await this.addHpoTermToCohort(this.selectedHpoTerm);
    
  };

  async addHpoTermToCohort(autocompletedTerm: string): Promise<void> {
    const template = this.cohortService.getCohortDto();
    if (template == null) {
      console.error("Attempt to add HPO Term to cohort but template is null");
      return;
    }
    if (autocompletedTerm) {
      const [id, label] = autocompletedTerm.split('-').map(s => s.trim());
      try {
        let updated_template = await this.configService.addHpoToCohort(id, label, template);
        this.showSuccess(`Successfully added ${label} (${id})`);
        this.cohortService.setCohortDto(updated_template);
      } catch (err) {
        console.error(err);
        this.showError(`Failed to add term ${label} (${id})`);
      }
    }
  }

  

  onRightClick(event: MouseEvent, hpoColumnIndex: number, hpoRowIndex: number, cell: CellValue) {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.pendingHpoColumnIndex = hpoColumnIndex;
    this.pendingHpoRowIndex = hpoRowIndex;
    this.selectedCellContents = cell;
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

  /* This function can only be called if contextMenuVisible is set true; this happens with the
  *  onRightClick function, which shows an option menu of actions for the cell. Then, when the user clicks
  * on one of those options, this function is called. The goal is to change the value of the cell 
  * and to persist it.
  */
  onMenuOptionClick(option: string): void {
    console.log("onMenuOptionClick option=",option);
    if (option.startsWith('focus')) {
      const parts = option.split('-');
      if (parts[1] === 'reset') {
        this.focusedHpoIndex = null;
        this.hpoFocusRange = 0;
      } else {
        this.focusedHpoIndex = this.pendingHpoColumnIndex;
        this.hpoFocusRange = parseInt(parts[1], 10);
      }
    } else if (this.selectedCellContents) {
      this.focusedHpoIndex = null;
      const currentDto = this.cohortService.getCohortDto();
      if (! currentDto) {
        alert("Cohort object is null (should never happen, please report to developers).");
        return;
      }
      const updatedRows = currentDto.rows.map((row, rIndex) => {
        if ( rIndex !== this.pendingHpoRowIndex) return row; // not the row we want to change, just return as-is
      const updatedHpoData = row.hpoData.map((cell, cIndex) => {
        cIndex === this.pendingHpoColumnIndex ? { ...cell, value: option } : cell;
      }); 

      return {...row, hpoData: updatedHpoData };
      });
      
    } 
    this.pendingHpoColumnIndex = null;
    this.pendingHpoRowIndex = null;
    this.contextMenuVisible = false;
  }

  onClickAnywhere(): void {
    this.contextMenuVisible = false;
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuVisible = false;
  }

  async saveCohort() {
    let acronym = this.cohortService.getCohortAcronym();
    if (acronym == null) {
      alert("Cannot save cohort with null acronym -- adding TEMP");
      acronym = "temp";

    }
    const cohortDto = this.cohortService.getCohortDto();
    if (cohortDto == null) {
      this.showError("Cannot save null cohort (cohort_dto is null");
      return; // should never happen!
    }
    
    await this.configService.saveCohort(cohortDto);
    this.cohortDescription = this.generateCohortDescriptionDto(cohortDto);
    
  }

  

  async exportPpkt() {
    if (! this.cohortDto) {
      alert("Cohort DTO not initialized");
      return;
    }
    const cohort_dto = this.cohortDto;
    try {
      await this.configService.exportPpkt(cohort_dto);
    } catch (err) {
      this.showError(String(err));
    }
  }

  /** Export the aggregate file for use in phenotype.hpoa (part of a small file) */
    async exportHpoa() {
      if (! this.cohortDto) {
        alert("Cohort DTO not initialized");
        return;
      }
      const cohort_dto = this.cohortDto;
      console.log("exportHpoa", cohort_dto);
      try {
        const message = await this.configService.exportHpoa(cohort_dto);
        this.showSuccess(message);
      } catch (err) {
        this.showError(err);
      }
    }



    /* Keep track of which cell is hovered over. The key is something like `${category}-${rowIndex}-${itemIndex}` */
    hoverState: Record<string, boolean> = {};
    setHover(category: string, rowIndex: number, itemIndex: number, hovered: boolean) {
      this.hoverState[`${category}-${rowIndex}-${itemIndex}`] = hovered;
    }
    isHovered(category: string, rowIndex: number, itemIndex: number): boolean {
      return !!this.hoverState[`${category}-${rowIndex}-${itemIndex}`];
    }



  /* flag -- if true, the GUI shows the dialog to enter an acronym */
  showCohortAcronym = false;

 async submitCohortAcronym(acronym: string) {
     const cohort_dto: CohortDto | null = await firstValueFrom(this.cohortService.cohortDto$); // make sure we get the very latest version
    console.log("submitCohortAcronym before", cohort_dto);
    if (acronym.trim()) {
      this.cohortService.setCohortAcronym(acronym.trim());
      this.showCohortAcronym = false;
    }
    const cohort_dto2: CohortDto | null = await firstValueFrom(this.cohortService.cohortDto$); // make sure we get the very latest version
    console.log("submitCohortAcronym afteter", cohort_dto2);
  }

  cancelCohortAcronym() {
    this.showCohortAcronym = false;
  }

  /* Create an OMIM URL from a string such as OMIM:654123 */
  getOmimId(diseaseId: string): string {
    const parts = diseaseId.split(":");
    return `https://omim.org/entry/${parts.length > 1 ? parts[1] : diseaseId}`;
  }

    // Convert the map into entries
    getAlleleEntries(row: RowDto): [string, number][] {
      return Object.entries(row.alleleCountMap);
    }

    /* Function to return list of strings for display for an individuals pathogenic alleles.
      Returns a 5-element array. We could transform to a DTO (todo)  */
    getAlleleDisplay(key: string, count: number): string[] {
      const cohort = this.cohortService.getCohortDto();
      let symbol = "na";
      let transcript = "na";
      let allele = "na";
      let allelecount = "na";
      if (cohort != null) {
        const hgvs = cohort.hgvsVariants[key];
        const sv = cohort.structuralVariants[key];
        allelecount = `n=${count}`;
        if (  hgvs) {
          symbol = hgvs.symbol;
          transcript = hgvs.transcript;
          allele = hgvs.hgvs;
        } else if (sv) {
          symbol = sv.geneSymbol;
          transcript = "na";
          allele = sv.label;
        }
      }
      return [allele, symbol, transcript, allelecount, key];
    }

    getShortAlleleDisplay(key: string, count: number): string {
      const cohort = this.cohortService.getCohortDto();
      let label = key;
      const allelecount = count.toString();
      if (cohort != null) {
        const hgvs = cohort.hgvsVariants[key];
          const sv = cohort.structuralVariants[key];
          if ( hgvs) {
            label = hgvs.hgvs;
          } else if (sv) {
            label = sv.label;
          }
      }
      return `${label} (n=${allelecount})`;
    }

}
