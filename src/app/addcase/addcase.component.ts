import { Component, inject, Input, NgZone } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ConfigService } from '../services/config.service';
import { defaultStatusDto, StatusDto } from '../models/status_dto';
import { PubmedComponent } from '../pubmed/pubmed.component';
import { AddageComponent } from '../addages/addage.component';
import { AdddemoComponent } from '../adddemo/adddemo.component';
import { AgeInputService } from '../services/age_service';
import { TextAnnotationDto } from '../models/text_annotation_dto';
import { GeneVariantData, IndividualData, CohortData } from '../../../libs/ui/src/lib/models/cohort_dto';
import { CellValue, CellValueInner, HpoTermData, HpoTermDuplet } from '../../../libs/ui/src/lib/models/hpo_term_dto';
import { MatIconModule } from '@angular/material/icon';
import { CohortDtoService } from '../services/cohort_dto_service';
import { AddVariantComponent, VariantKind } from '../addvariant/addvariant.component';
import { VariantDto, VariantType } from '../../../libs/ui/src/lib/models/variant_dto';
import { MatDialog } from '@angular/material/dialog';
import { defaultDemographDto, DemographDto } from '../models/demograph_dto';
import { Router } from '@angular/router';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';
import { NotificationService } from 'ng-hpo-uikit';
import { ConfirmDialogComponent, toCellValue } from '@workspace/ui';
import { signal, computed } from '@angular/core';
import { catchError, firstValueFrom, from, Observable, of } from 'rxjs';
import { HelpButtonComponent } from 'ng-hpo-uikit';
import { AppStatusService } from '../services/app_status_service';
import { HierarchyMapItem, HpoTwostepData, OntologyMatch, PolishedHpoAnnotation } from 'ng-hpo-uikit';
import { HpoDialogWrapperComponent } from '../util/hpo-dialog-wrapper.component';




/**
 * Component to add a single case using text mining and HPO autocompletion.
 */
@Component({
  selector: 'app-addcase',
  standalone: true,
  imports: [FormsModule, MatIconModule, HelpButtonComponent, AdddemoComponent],
  templateUrl: './addcase.component.html',
  styleUrl: './addcase.component.scss',
})
export class AddcaseComponent {
  @Input() annotations: TextAnnotationDto[] = [];
  private configService = inject(ConfigService);
  public ageService = inject(AgeInputService);
  private cohortService = inject(CohortDtoService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private ngZone = inject(NgZone);

  readonly pmidDto = signal<PmidDto>(defaultPmidDto());
  readonly demographData = signal<DemographDto>(defaultDemographDto());
  readonly hpoAnnotations = signal<HpoTermData[]>([]);
  readonly alleles = signal<VariantDto[]>([]);
  public statusService = inject(AppStatusService);

  public VariantKind = VariantKind;


  pastedText = '';
  showTextArea = true;
  showDataEntryArea = false;
  showAgeEntryArea = true;
  showCollapsed = true;
  showAnnotationTable = false;
  showPopup = false;
  showHoverPopup = false;
  selectedAnnotation: TextAnnotationDto | null = null;

  readonly hpoInitialized = computed(() => this.statusService.state().hpoLoaded);

  /* Once we have annotations from the first step, show the second step! */
  readonly showTwoStepHpoButton = computed(() => this.hpoAnnotations().length === 0);

  selectionRange: Range | null = null;
  showDropdownMap: Record<string, boolean> = {};
  rightClickOptions: string[] = [];
  predefinedOptions: string[] = ['observed', 'excluded', 'na'];
  selectedOptions: string[] = []; //  selected radio button values
  customOptions: string[] = []; // manually entered custom options
  errorString: string | null = null;
  hasError = false;

  selectedText = '';
  popupX = 0;
  popupY = 0;
  uniqueAnnotatedTerms: string[] = [];

  backend_status: StatusDto = defaultStatusDto();

  /* used for autocomplete widget */
  hpoInputString = '';
  selectedHpoTerm: HpoTermDuplet | null = null;
  protected hierarchyCache = signal<Record<string, HierarchyMapItem>>({});

  readonly ageEntries = computed(() => this.ageService.selectedTerms());

demographicSummary = computed<string | null>(() => {
  const value = this.demographData(); // Angular automatically tracks this dependency
  if (!value?.individualId) {
    return null;
  }
  const details = [
    value.ageAtLastEncounter !== 'na' && `age: ${value.ageAtLastEncounter}`,
    value.ageOfOnset !== 'na' && `onset: ${value.ageOfOnset}`
  ].filter(Boolean).join(', ');
  const sexLabels: Record<string, string> = {
    'M': 'male',
    'F': 'female',
    'U': 'unknown sex',
    'O': 'other sex'
  };
  const deceasedLabels: Record<string,string> = {
    'yes': 'deceased',
    'no': 'alive'
  };

  const humanReadableSex = sexLabels[value.sex] || 'unknown sex';
  const deceasedLab = deceasedLabels[value.deceased] || 'unknown vital status';
  const baseInfo = [
    details && `${details}`,
    `${humanReadableSex}`,
    `${deceasedLab}`
  ].filter(Boolean).join('; ');
  const mainSummary = `Individual: ${value.individualId} - ${baseInfo}`;
  return value.comment ? `${mainSummary} (${value.comment})` : mainSummary;
});

  /** This function is called when the user wants to finalize
   * the creation of a new Phenopacket row with all information
   * for one new case.
   */
  async submitNewRow(): Promise<void> {
    const pmid = this.pmidDto();
    const demo = this.demographData();
    const hpoAnn = this.hpoAnnotations();
    const allelesArr = this.alleles();
    if (!pmid.pmid) {
      this.notificationService.showError('Cannot submit new row without PMID');
      return;
    }
    if (!demo) {
      this.notificationService.showError(
        'Cannot submit row unless demographic information is initialized',
      );
      return;
    }
    // combine PMID and Demographic data DTOs to create an individual
    const individual_dto: IndividualData = {
      pmid: pmid.pmid,
      title: pmid.title,
      individualId: demo.individualId,
      comment: demo.comment,
      ageOfOnset: demo.ageOfOnset,
      ageAtLastEncounter: demo.ageAtLastEncounter,
      deceased: demo.deceased,
      sex: demo.sex,
    };
    const allele_keys: string[] = allelesArr.filter((a) => a.variantKey).map((a) => a.variantKey!);
    const cohort_dto = this.cohortService.getCohortData();
    if (cohort_dto != null) {
      try {
        const updated_dto: CohortData = await this.configService.addNewRowToCohort(
          individual_dto,
          hpoAnn,
          allele_keys,
          cohort_dto,
        );
        this.cohortService.setCohortData(updated_dto);
      } catch (error) {
        this.errorString = `Could not add new row: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
        this.notificationService.showError(this.errorString);
      }
    } else {
      this.notificationService.showError('Attempt to add new row with null template_dto');
    }
    this.resetAllInputVars();
    /* After creating a new row, we jump to the template editor component. */
    await this.router.navigate(['/pttemplate']);
  }

  setError(errMsg: string): void {
    this.errorString = errMsg;
    this.hasError = true;
  }

  clearError(): void {
    this.errorString = '';
    this.hasError = false;
  }

  addCustomOption(index: number): void {
    const customValue = this.customOptions[index]?.trim();
    if (customValue && !this.predefinedOptions.includes(customValue)) {
      this.predefinedOptions.push(customValue);
      this.selectedOptions[index] = customValue;
    }
  }

  getObjectKeys(obj: Record<string, unknown> | null | undefined): string[] {
    return obj ? Object.keys(obj) : [];
  }

  resetWindow(): void {
    this.ngZone.run(() => {
      this.showTextArea = true;
    });
  }

  closePopup(): void {
    this.showPopup = false;
    this.selectedAnnotation = null;
  }

  openPopup(ann: TextAnnotationDto, event: MouseEvent): void {
    this.rightClickOptions = [...this.predefinedOptions, ...this.ageService.selectedTerms()];
    this.selectedAnnotation = ann;
    this.showPopup = true;
    // Get the clicked element's bounding box
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    // Position relative to the page
    this.popupX = rect.left + window.scrollX;
    this.popupY = rect.bottom + window.scrollY;
  }
  toggleObserved(annot: TextAnnotationDto | null): void {
    if (annot == null) {
      return;
    }
    annot.isObserved = !annot.isObserved;
  }

  /* The following commands deal with the table of annotated terms */
  annotateSelectedText(): void {
    throw new Error('Method not implemented.');
  }

  /* This is called by the button to submit the annotations obtained by fenominal text mining
    of an input text. */
  submitAnnotations(): void {
    this.rightClickOptions = [...this.predefinedOptions, ...this.ageService.selectedTerms()];
    this.showAnnotationTable = true;
    this.showCollapsed = false;
    this.showTextArea = false;
  }

  /* About half of the TextAnnotationDto objects represent the text between the fenominal hits
    Here, we get a list of the fenominal hits (representing the HPO terms) for display in the table */
  getFenominalAnnotations(): TextAnnotationDto[] {
    return this.annotations.filter((a) => a.isFenominalHit);
  }

  /* Remove an annotation from the HTML table. */
  deleteAnnotation(index: number): void {
    this.annotations.splice(index, 1);
  }

  updateOnset(annotation: TextAnnotationDto, newValue: string): void {
    annotation.onsetString = newValue;
  }

  openVariantEditor(varKind: VariantKind): void {
    const dialogRef = this.dialog.open(AddVariantComponent, {
      data: { kind: varKind },
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result: VariantDto | undefined) => {
      if (!result) return;
      const { variantKey, count: alleleCount, isValidated } = result;
      if (variantKey == null) {
        this.notificationService.showError('Could not retrieve variantKey');
        return;
      }
      if (!isValidated) {
        this.notificationService.showError('Variant could not be validated');
        return;
      }
      const typeMapping: Record<VariantKind, string> = {
        [VariantKind.HGVS]: 'HGVS',
        [VariantKind.SV]: 'SV',
        [VariantKind.INTERGENIC]: 'INTERGENICHGVS',
      };
      const variantType = typeMapping[varKind];
      if (!variantType) {
        return this.notificationService.showError(`Could not identify variant kind ${varKind}`);
      }
      const dto: VariantDto = {
        ...result,
        variantType: variantType as VariantType,
        transcript: variantType === 'INTERGENIC' ? '' : result.transcript,
        isValidated: false,
      };

      const entriesToAdd = alleleCount === 2 ? [dto, dto] : [dto];
      this.alleles.update((current) => [...current, ...entriesToAdd]);
    });
  }

  removeAllele(allele: VariantDto): void {
    this.alleles.update((list) => list.filter((a) => a !== allele));
  }

  createGeneVariantBundleDto(): GeneVariantData | null {
    if (this.alleles.length == 0) {
      this.notificationService.showError('allele 1 was null, cannot create GeneVariant bundle');
      return null; // need at least allele1 to move forward
    }
    const allele1 = this.alleles()[0];
    let allele2_string = 'na';
    if (this.alleles.length == 2) {
      allele2_string = this.alleles()[1].variantString;
    }
    return {
      hgncId: allele1.hgncId,
      geneSymbol: allele1.geneSymbol,
      transcript: allele1.transcript || 'na',
      allele1: allele1.variantString,
      allele2: allele2_string,
      variantComment: '',
    };
  }

  resetAllInputVars(): void {
    this.resetWindow();
    this.alleles.set([]);
    this.annotations = [];
    this.hpoAnnotations.set([]);
    this.demographData.set(defaultDemographDto());
    this.pmidDto.set(defaultPmidDto());
  }

  private async selectPmid(): Promise<PmidDto | null> {
    const dialogRef = this.dialog.open(PubmedComponent, {
      width: '600px',
      data: { pmidDto: this.pmidDto() },
    });

    return firstValueFrom(dialogRef.afterClosed());
  }

  private async confirmDuplicatePmid(pmid: string): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Duplicate PMID',
        message: `${pmid} is already in the database. Continue anyway?`,
        confirmText: 'Continue',
        cancelText: 'Cancel',
        helpTitle: 'PMID Management',
        helpLines: [
          'Duplicate entries should be avoided!.',
          'Only one entry per PMID/individual is allowed.',
          '<strong>Proceed only</strong> if you are sure this PMID/individual has not been previously entered.',
        ],
        helpUrl: 'https://p2gx.github.io/phenoboard/help/case.html#lookup-pubMed',
      },
    });

    return firstValueFrom(ref.afterClosed());
  }

  async openPubmedDialog(): Promise<void> {
    const result = await this.selectPmid();
    if (!result) return;

    const pmid = result.pmid;

    if (this.cohortService.pmidExists(pmid)) {
      const confirmed = await this.confirmDuplicatePmid(pmid);

      if (!confirmed) {
        this.notificationService.showWarning('Cancelled adding duplicate PMID.');
        this.pmidDto.set(defaultPmidDto());
        return;
      }

      this.notificationService.showWarning(`Continuing with duplicate PMID ${pmid}`);
    }

    this.pmidDto.set(result);
  }

  resetPmidDto(): void {
    this.pmidDto.set(defaultPmidDto());
  }


  openHpoTwoStepDialog(): void {
    console.log('openHpoTwoStepDialog');
     const dialogData: HpoTwostepData = {
      mineTextProvider: (text: string) => this.configService.mineClinicalText(text),
      autocompleteProvider: (query: string) => this.performHpoAutocomplete(query),
      hierarchyProvider: (termId: string) => this.fetchHpoHierarchy(termId),
      availableModifiers: () => this.configService.getHpoModifiers()
    };

      const dialogRef = this.dialog.open(HpoDialogWrapperComponent, {
      width: '85vw',
      maxWidth: '1200px',
      height: '80vh',
      disableClose: true,
      data: dialogData
    });
    dialogRef.afterClosed().subscribe((polishedAnnotations?: PolishedHpoAnnotation[]) => {
      if (polishedAnnotations) {
        const hpoTermDataList: HpoTermData[] = polishedAnnotations.map(pa => {
          const htd:HpoTermData = {
            termDuplet: {
              hpoLabel: pa.label,
              hpoId: pa.termId
            },
            entry: toCellValue(pa)
          };
          return htd;
        });
        this.hpoAnnotations.set(hpoTermDataList);
      }
    });
  }

  resetAnnotations(): void {
    this.hpoAnnotations.set([]);
  }

  openAgeDialog(): void {
    const dialogRef = this.dialog.open(AddageComponent, {
      width: '400px',
      data: {
        /* pass inputs if needed */
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.notificationService.showSuccess(`Added age "${result}"`);
      }
    });
  }


  isDemoDialogOpen = signal<boolean>(false);

  openAddDemoDialog(): void {
    this.isDemoDialogOpen.set(true);
  }

  closeAddDemoDialog(): void {
    this.isDemoDialogOpen.set(false);
  }

  onDemoFormSubmitted(result: { dto: DemographDto; hideDemo: boolean }): void {
    if (result?.dto) {
      this.demographData.set(result.dto);
      this.showAgeEntryArea = !result.hideDemo;
      this.closeAddDemoDialog();
    } else {
      this.notificationService.showError('Could not get demographic data');
    }
  }



  /** Do we have all of the information needed to submit a row? */
  readonly canSubmitRow = computed(
    () =>
      !!(
        this.pmidDto().pmid &&
        this.demographData() &&
        this.hpoAnnotations().length > 0 &&
        this.alleles().length > 0
      ),
  );

  /* Show the HPO terms retrieved from text mining */
  getEntryLabel(annot: HpoTermData): string {
    const entry = annot.entry;
    const label = annot.termDuplet.hpoLabel;
    switch (entry.type) {
      case 'Observed':
        return `${label}: Observed`;
      case 'Excluded':
        return `${label}: Excluded`;
      case 'OnsetAge':
        return `${label}: ${entry.data}`; // the actual age string
      default:
        return label; // should never get here, actually.
    }
  }

   performHpoAutocomplete = (query: string): Observable<OntologyMatch[]> => {
    return from(this.configService.performHpoAutocomplete(query)).pipe(
      catchError(err => {
        this.notificationService.showError(String(err));
        return of([]);
      })
    );
  };

     
  fetchHpoHierarchy = (termId: string): Promise<HierarchyMapItem> => {
    const cached = this.hierarchyCache()[termId];
    if (cached) {
      return Promise.resolve(cached);
    }
    return this.configService.getHpoParentAndChildrenTerms(termId).then(data => {
      this.hierarchyCache.update(cache => ({ ...cache, [termId]: data }));
      return data;
    });
  };
   
}
