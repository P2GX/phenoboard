import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';
import { IndividualData, CohortData, RowData, CellValue, ModeOfInheritance, GeneTranscriptData, DiseaseData, getRowId, PtContextMenuComponent, VariantDto } from '@workspace/ui';
import { AddageComponent } from '../addages/addage.component';
import { IndividualEditComponent } from '../individual_edit/individual_edit.component';
import { AgeService } from 'ng-hpo-uikit';
import { CohortDtoService } from '../services/cohort_dto_service';
import { IconComponent, NotificationService, OntologyAutocompleteComponent } from 'ng-hpo-uikit';
import { HpoTermDuplet } from '@workspace/ui';
import { AddVariantComponent, VariantKind } from '../addvariant/addvariant.component';
import { FormsModule } from '@angular/forms';
import { CohortSummaryComponent } from '../cohortsummary/cohortsummary.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@workspace/ui';
import { HelpButtonComponent } from 'ng-hpo-uikit';
import { openUrl } from '@tauri-apps/plugin-opener';
import { RouterLink } from '@angular/router';
import { OntologyMatch } from '@workspace/ui';
import { PopoverComponent } from '../util/popover/popover-component';
import { OverlayModule, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { HelpService } from '../services/help.service';
import {
  TableCellEditorComponent,
} from '../util/table-cell-editor/table-cell-editor.component';
import { CohortWorkflowService } from '../services/cohort-workflow.service';
import { WorkflowError } from '../services/cohort-workflow.errors';
import { CohortViewModel } from '../services/cohort-view-model.service';
import { TableContext, TableInteractionService } from '../services/table-interaction.service';
import { ChangeDetectorRef } from '@angular/core';
import { Observable, of } from 'rxjs';

interface Option {
  label: string;
  value: string;
}

@Component({
  selector: 'app-pttemplate',
  standalone: true,
  imports: [
    CdkOverlayOrigin,
    CommonModule,
    FormsModule,
    OverlayModule,
    CohortSummaryComponent,
    HelpButtonComponent,
    IndividualEditComponent,
    RouterLink,
    PopoverComponent,
    TableCellEditorComponent,
    OntologyAutocompleteComponent,
    PtContextMenuComponent,
    AddageComponent,
    ConfirmDialogComponent,
    IconComponent,
    IndividualEditComponent,
    AddVariantComponent
],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PtTemplateComponent {
  public cohortService = inject(CohortDtoService);
  private helpService = inject(HelpService);
  private workflowService = inject(CohortWorkflowService);
  protected interactionService = inject(TableInteractionService);
  private cdr = inject(ChangeDetectorRef);
  cohortData = this.cohortService.cohortData;
  hpoGroups = signal(new Map<string, HpoTermDuplet[]>());
  isLoadingHpo = signal(false);
  // the id of the allele popover that is open - use to prevent duplicates
  readonly activePopoverId = signal<string | null>(null);

  constructor() {
    effect(async () => {
      const acronym = this.cohortData()?.cohortAcronym;
      const cohort = this.cohortData();
      if (cohort && acronym) {
        this.isLoadingHpo.set(true);
        try {
          const groupsObj = await this.configService.getTopLevelHpoTerms(cohort);
          this.hpoGroups.set(new Map(Object.entries(groupsObj ?? {})));
        } catch (err) {
          console.error('Failed to fetch HPO groups:', err);
        } finally {
          this.isLoadingHpo.set(false);
        }
      }
    });
    this.helpService.setHelpContext('cohort-editor');
  }
  /** Key: top-level term (represented in Cohort), value: all descendents of the term in our Cohort dataset */
  readonly hpoGroupKeys = computed(() => Array.from(this.hpoGroups().keys()));
  private configService = inject(ConfigService);
  private ageService = inject(AgeService);
  private notificationService = inject(NotificationService);
  readonly ageEntries = this.ageService.selectedTerms;
  protected showAgeDialog = signal<boolean>(false);

  @ViewChild(AddageComponent) addagesComponent!: AddageComponent;
  @ViewChild('tableWrapper') tableWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('topScrollMirror') topScrollMirror!: ElementRef<HTMLDivElement>;
  @ViewChild('tableWidthRef') tableElement!: ElementRef<HTMLTableElement>;
  @ViewChild('contextMenu') contextMenuElement?: ElementRef<HTMLDivElement>;
  @ViewChild('individualContextMenu') individualContextMenuElement?: ElementRef<HTMLDivElement>;
  @ViewChild('hpoContextMenu') hpoContextMenu: ElementRef | undefined;
  @ViewChild('rowInfoPopup') rowInfoPopupElement?: ElementRef<HTMLDivElement>;
  tableWidth = '100%';
  Object = Object; // expose global Object to template
  public readonly VariantKind = VariantKind;
  successMessage: string | null = null;

  /* used for autocomplete widget */
  hpoInputString = '';
  selectedHpoTerm: HpoTermDuplet | null = null;
  /* used for right-click option menu */
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  /* used for first column only */
  individualContextMenuVisible = false;
  individualMenuTrigger = signal<{ x: number; y: number } | null>(null);
  individualMenuX = 0;
  individualMenuY = 0;

  contextRowId: string | null = null;

  // Tracks currently hovered HPO header
  hoveredHpoHeader: number | null = null;
  // corresponds to the + sighn for adding a new allele on a row
  openAddAlleleRowId: string | null = null;

  infoMenuPos = signal<{ x: number; y: number } | null>(null);
  activeInfoRow = signal<RowData | null>(null); // Use your RowData interface

  // the following determine which rows are shown in the GUI

  filterMode = signal<'all' | 'single' | 'pmid'>('all');
  focusedRow = signal<RowData | null>(null);
  focusedPmid = signal<string | null>(null);
  currentHpoLabel = signal<string>('');

  /* Extract the filtered rows from our model after any change. */
  filteredRows = computed(() => {
    const cohort = this.cohortData();
    if (!cohort) return [];
    const mode = this.filterMode();
    const allRows = cohort.rows;
    switch (mode) {
      case 'single': {
        const row = this.focusedRow();
        return row ? [row] : allRows;
      }
      case 'pmid': {
        const pmid = this.focusedPmid();
        return pmid ? allRows.filter((r) => r.individualData.pmid === pmid) : allRows;
      }
      case 'all':
      default:
        return allRows;
    }
  });

  rowMapById = computed(() => {
    const map = new Map<string, RowData>();
    for (const row of this.filteredRows()) {
      map.set(getRowId(row.individualData), row);
    }
    return map;
  });

  /* Create a view model. The data obsejects are computed once upon change of filteredRows, 
    not for each change detection cycle in the GUI. */
  readonly tableVM = computed(() => {
    return CohortViewModel.create(
      this.filteredRows(),
      this.shortAlleleDisplayByKey(),
      this.validatedAlleles(),
    );
  });

  focusedHpoIndex: number | null = null;
  hpoFocusRange = 0; // number of columns to each side
  cohortAcronymInput = '';

  public rowInfoKey: string | null = null;
  rowInfoVisible = false;

  predefinedOptions: Option[] = [
    { label: 'Observed ✅', value: 'observed' },
    { label: 'Excluded ❌', value: 'excluded' },
    { label: 'N/A', value: 'na' },
  ];

  /** Alleles that have been validated (and will show green). */
  validatedAlleles = computed<Set<string>>(() => {
    const cohort = this.cohortData();
    if (!cohort) return new Set<string>();
    return new Set<string>([
      ...Object.keys(cohort.hgvsVariants ?? {}),
      ...Object.keys(cohort.structuralVariants ?? {}),
      ...Object.keys(cohort.intergenicVariants ?? {}),
    ]);
  });

  isAlleleValidatedCached(key: string): boolean {
    return this.validatedAlleles().has(key);
  }

  contextMenuOptions: Option[] = [];

  /** e.g., show just terms that descend from a top level term such as Abnormality of the musculoskeletal system HP:0033127 */
  selectedTopLevelHpo = signal<string | null>(null);
  /** If set, show only the single column matching this exact HPO ID */
  selectedSingleHpoId = signal<string | null>(null);

  /* Load the Phetools template from the backend only if the templateService 
    has not yet been initialized. */
  async loadTemplate(): Promise<void> {
    const existing = this.cohortData();
    if (!existing) {
      try {
        const data = await this.configService.getPhetoolsTemplate();
        this.cohortService.setCohortData(data);
      } catch (error) {
        this.notificationService.showError(`❌ Failed to load template: ${error}`);
      }
    }
  }

  async loadTemplateFromBackend(): Promise<void> {
    this.configService.getPhetoolsTemplate().then((data: CohortData) => {
      this.cohortService.setCohortData(data);
    });
  }


  editingIndividual = signal<IndividualData | null>(null);

  openIndividualEditDialog(individual: IndividualData): void {
    this.editingIndividual.set(individual);
  }

  handleIndividualSaved(newIndividualData: IndividualData | null): void {
    if (newIndividualData === null) {
      this.notificationService.showError("Could not retrieve updated individual data");
      return;
    }
    this.editingIndividual.set(null);
    const row = this.activeInfoRow();
    if (!row) return;
    const cohort = this.cohortData();
    if (!cohort) return; // safeguard, but should never happen
    const rowId = getRowId(row.individualData);
    const individualCopy = { ...row.individualData };
    const updatedRows = cohort.rows.map((row) => {
          // Use the stable rowId captured when the dialog opened
          if (getRowId(row.individualData) === rowId) {
            return {
              ...row,
              individualData: { ...newIndividualData },
            };
          }
          return row;
        });
    const newCohort = { ...cohort, rows: updatedRows };
    this.cohortService.setCohortData(newCohort);
    // Update the info key (e.g., if the individual id was changed inthe dialog)
    this.rowInfoKey = getRowId(newIndividualData);
  }


  onAlleleCountChange(alleleString: string, rowId: string, newCount: number): void {
    const cohort = this.cohortData();
    if (!cohort || !alleleString) return;

    const updatedRows = cohort.rows.map((r) => {
      if (getRowId(r.individualData) !== rowId) return r;
      const newAlleleCountMap = { ...r.alleleCountMap };
      if (newCount === 0) {
        delete newAlleleCountMap[alleleString];
      } else {
        newAlleleCountMap[alleleString] = newCount;
      }
      return { ...r, alleleCountMap: newAlleleCountMap };
    });
    this.cohortService.setCohortData({ ...cohort, rows: updatedRows });
  }

  hoveredCell: { rowId: string; alleleKey: string } | null = null;

  onMouseEnter(rowId: string, alleleKey: string): void {
    this.hoveredCell = { rowId, alleleKey };
  }

  onMouseLeave(): void {
    this.hoveredCell = null;
  }

  // The following control the allele popover
  readonly activePopoverTarget = signal<{ rowId: string; alleleId: string } | null>(null);

  setActivePopover(rowId: string, alleleId: string) {
    this.activePopoverTarget.set({ rowId, alleleId });
  }

  isPopoverOpen(rowId: string, alleleId: string): boolean {
    const current = this.activePopoverTarget();
    return current !== null && current.rowId === rowId && current.alleleId === alleleId;
  }

  showVariantEditor = signal(false);
  protected variantEditorKind = signal<VariantKind | null>(null);
  private variantEditorRowId: string | null = null;

  addAllele(rowId: string, varKind: VariantKind): void {
    const row = this.rowMapById().get(rowId);
    if (!row) return;

    this.variantEditorRowId = rowId;
    this.variantEditorKind.set(varKind);
    this.showVariantEditor.set(true);
  }

  onVariantEditorResult(result: VariantDto | undefined): void {
    this.showVariantEditor.set(false);

    if (!result) {
      this.notificationService.showError('Error in open Allele Dialog: Could not retrieve result');
      return;
    }
    const { variantKey, isValidated, count } = result;
    if (!variantKey) {
      this.notificationService.showError('Could not retrieve variantKey');
      return;
    }
    if (!isValidated) {
      this.notificationService.showError('Variant could not be validated');
      return;
    }
    const rowId = this.variantEditorRowId;
    if (!rowId) {
      this.notificationService.showError('Missing rowId for allele addition');
      return;
    }
    const ok = this.cohortService.addAlleleToRow(rowId, variantKey, count);
    if (!ok) {
      this.notificationService.showError('Failed to add allele');
      return;
    }
    this.notificationService.showSuccess(`Allele ${variantKey} added`);
    this.variantEditorKind.set(null);
  }


/*
  async addAlleleOLD(rowId: string, varKind: VariantKind): Promise<void> {
    const row = this.rowMapById().get(rowId);
    if (!row) return;
    const dialogRef = this.dialog.open(AddVariantComponent, {
      width: '600px',
      data: { kind: varKind },
    });
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) {
      this.notificationService.showError('Error in open Allele Dialog: Could not retrieve result');
      return;
    }
    const { variantKey, isValidated, count } = result;
    if (!variantKey) {
      this.notificationService.showError('Could not retrieve variantKey');
      return;
    }
    if (!isValidated) {
      this.notificationService.showError('Variant could not be validated');
      return;
    }
    const ok = this.cohortService.addAlleleToRow(rowId, variantKey, count);
    if (!ok) {
      this.notificationService.showError('Failed to add allele');
      return;
    }
    this.notificationService.showSuccess(`Allele ${variantKey} added`);
  }*/

  get diseaseDescription(): string {
    const cohort = this.cohortData();
    if (!cohort) {
      return 'Could not retrieve cohort';
    }
    const diseaseStrings = cohort.diseaseList.map((disease) => {
      const label = disease.diseaseLabel ?? 'Unknown disease';
      const genes = disease.geneTranscriptList
        ?.map((g) => g.geneSymbol)
        .filter((s: string | undefined) => !!s)
        .join(', ');
      return genes ? `${label} (${genes})` : label;
    });
    return diseaseStrings.join(' and ');
  }

  numVariants = computed((): number => {
    const cohort = this.cohortData();
    if (!cohort) {
      return 0;
    } else {
      return (
        Object.keys(cohort.hgvsVariants).length + Object.keys(cohort.structuralVariants).length
      );
    }
  });

  confirmDialogData = signal<ConfirmDialogData | null>(null);
  private resolveConfirm?: (value: boolean) => void;

  /**
   * Opens the confirmation dialog for sanitization and returns the user's choice.
   * @param errorMessage The error message to display in the dialog
   * @returns A promise that resolves to true if the user chooses 'Sanitize'
   */
  private async openSanitizeDialog(errorMessage: string): Promise<boolean> {
    this.confirmDialogData.set({
      title: 'Validation Issues',
      message: `The cohort has errors: "${errorMessage}". Would you like to automatically sanitize the data?`,
      confirmText: 'Sanitize',
      cancelText: 'Cancel',
    });

    return new Promise((resolve) => {
      this.resolveConfirm = resolve;
    });
  }

  /* handle the user's response to the ontology sanitize dialog */
  handleConfirmResult(confirmed: boolean): void {
    this.confirmDialogData.set(null);
    this.resolveConfirm?.(confirmed); // Resolves the promise from openSanitizeDialog
  }

  async validateCohort(): Promise<void> {
    const cohortData = this.cohortData();
    try {
      await this.workflowService.validateCohort(cohortData);
    } catch (err: unknown) {
      if (err instanceof WorkflowError && err.code === 'VALIDATION_FAILED') {
        // The logic is now a simple "branching" call
        const shouldSanitize = await this.openSanitizeDialog(err.message);

        if (shouldSanitize) {
          try {
            await this.workflowService.sanitizeCohort(cohortData!);
            this.notificationService.showSuccess('Sanitization complete. You can now re-validate.');
          } catch (sanitError) {
            this.notificationService.showError('Sanitization failed: ' + sanitError);
          }
        }
      }
    }
  }

  hpoAutocompleteProvider = (query: string) => this.configService.performHpoAutocomplete(query);

  async onHpoTermSelected(selectedTerm: OntologyMatch): Promise<void> {
    if (!selectedTerm) {
      this.notificationService.showError('Could not retrieve valid HPO term');
      return;
    }
    const duplet: HpoTermDuplet = {
      hpoLabel: selectedTerm.label,
      hpoId: selectedTerm.id,
    };
    await this.addHpoTermToCohort(duplet);
    // After adding term to cohort, it is still not annotated. 
    // Therefore, we focus the table on the new term so the curator can add annotation
    this.selectedTopLevelHpo.set(null);
    this.selectedSingleHpoId.set(duplet.hpoId);
    this.ontologyAutocomplete()?.clear();
  }

  async addHpoTermToCohort(autocompletedTerm: HpoTermDuplet): Promise<void> {
    const template = this.cohortData();
    if (template == null) {
      this.notificationService.showError('Attempt to add HPO Term to cohort but template is null');
      return;
    }
    if (autocompletedTerm) {
      try {
        const updated_template = await this.configService.addHpoToCohort(
          autocompletedTerm.hpoId,
          autocompletedTerm.hpoLabel,
          template,
        );
        this.notificationService.showSuccess(
          `Successfully added ${autocompletedTerm.hpoLabel} (${autocompletedTerm.hpoId})`,
        );
        this.cohortService.setCohortData(updated_template);
      } catch (err) {
        const errMsg = `Failed to add term ${autocompletedTerm.hpoLabel} (${autocompletedTerm.hpoId}): ${err}`;
        this.notificationService.showError(errMsg);
      }
    }
  }

  /** Open a context menu after a right-click on an HPO column */
  onRightClick(
    event: MouseEvent,
    hpoColumnIndex: number,
    hpoRowIndex: number,
    rowId: string,
    cell: CellValue,
  ): void {
    this.interactionService.open(rowId, hpoColumnIndex, hpoRowIndex, cell, event);
    this.cdr.detectChanges();
    this.contextMenuOptions = [
      ...this.predefinedOptions,
      { label: '--- (Onset ages) ---', value: 'separator' },
      ...this.ageService.selectedTerms().map((term) => ({
        label: term,
        value: term,
      })),
    ];
    this.setCurrentColumnLabel(hpoColumnIndex);
  }

  private setCurrentColumnLabel(hpoColIdx: number): void {
    const cohort = this.cohortData();
    if (!cohort) return;
    if (hpoColIdx >= cohort.hpoHeaders.length) {
      this.notificationService.showError(
        `Attempt to get HPO column index ${hpoColIdx} but table has ${cohort.hpoHeaders.length} columns`,
      );
      return;
    }
    const header = cohort.hpoHeaders[hpoColIdx];
    this.currentHpoLabel.set(`${header.hpoLabel} (${header.hpoId})`);
  }

  shouldDisplayHpoColumn(index: number): boolean {
    if (this.focusedHpoIndex === null) return true;
    return (
      index >= this.focusedHpoIndex - this.hpoFocusRange &&
      index <= this.focusedHpoIndex + this.hpoFocusRange
    );
  }

  /**  Update the indicated table cell to have the new indicated CellValue (e.g., na, excluded, P14D).
   * This is called after the user has right-clicked on an HPO cell -  onRightClick, which sets
   * this.contextMenuVisible to true, allowing the methods onMenuOptionClick to be called, which in
   * turn calls this method with the indicated row and column index
   */
  updateHpoCell(
    cohort: CohortData,
    targetRowId: string, // Changed from RowData to string
    colIndex: number,
    newValue: CellValue,
  ): CohortData {
    return {
      ...cohort,
      rows: cohort.rows.map((row) =>
        getRowId(row.individualData) === targetRowId
          ? {
              ...row,
              hpoData: row.hpoData.map((cell, cIdx) => (cIdx === colIndex ? newValue : cell)),
            }
          : row,
      ),
    };
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:contextmenu', ['$event'])
  closeContextMenu(event: MouseEvent): void {
      console.log('[closeContextMenu] event type:', event.type, 'target:', event.target);

    const menu = this.contextMenuElement?.nativeElement;
    const individualMenu = this.individualContextMenuElement?.nativeElement;
    const hpoContextMenu = this.hpoContextMenu?.nativeElement;
    const rowInfoPopup = this.rowInfoPopupElement?.nativeElement;
    const target = event.target as Node;
    const inside = 
      (menu && menu.contains(target)) ||
      (individualMenu && individualMenu.contains(target)) ||
      (hpoContextMenu && hpoContextMenu.contains(target)) || 
      (rowInfoPopup && rowInfoPopup.contains(target));
    console.log('[closeContextMenu] inside a menu?', inside);
    if (inside) return;
    console.log('[closeContextMenu] resetting all menu visibility flags');
    this.contextMenuVisible = false;
    this.individualContextMenuVisible = false;
    this.closeRowInfo();
  }

  async saveCohort(): Promise<void> {
    const cohort = this.cohortData();
    this.workflowService.saveCohort(cohort);
  }

  async exportPpkt(): Promise<void> {
    const cohort_dto = this.cohortData();
    if (!cohort_dto) {
      this.notificationService.showError('CohortData not initialized');
      return;
    }
    try {
      const n_exported = await this.configService.exportCohortWorkflow(cohort_dto);
      this.notificationService.showSuccess(`Exported ${n_exported} phenopackets.`);
    } catch (err) {
      this.notificationService.showError(String(err));
    }
  }

  /** Export the aggregate file for use in phenotype.hpoa (part of a small file) */
  async exportHpoa(): Promise<void> {
    const cohortDto = this.cohortData();
    if (!cohortDto) {
      this.notificationService.showError('Cohort DTO not initialized');
      return;
    }
    try {
      const message = await this.configService.exportHpoa(cohortDto);
      this.notificationService.showSuccess(message);
    } catch (err) {
      this.notificationService.showError(String(err));
    }
  }

  /* Keep track of which cell is hovered over. The key is something like `${category}-${rowIndex}-${itemIndex}` */
  hoverState: Record<string, boolean> = {};
  setHover(category: string, rowIndex: number, itemIndex: number, hovered: boolean): void {
    this.hoverState[`${category}-${rowIndex}-${itemIndex}`] = hovered;
  }
  isHovered(category: string, rowIndex: number, itemIndex: number): boolean {
    return !!this.hoverState[`${category}-${rowIndex}-${itemIndex}`];
  }

  /* flag -- if true, the GUI shows the dialog to enter an acronym */
  showCohortAcronym = false;
  showMoi = false;

  async submitCohortAcronym(acronym: string): Promise<void> {
    if (acronym.trim()) {
      this.cohortService.setCohortAcronym(acronym.trim());
      this.showCohortAcronym = false;
    }
  }

  cancelCohortAcronym(): void {
    this.showCohortAcronym = false;
  }

  // Convert the map into entries
  getAlleleEntries(row: RowData): [string, number][] {
    return Object.entries(row.alleleCountMap);
  }

  /* Function to return list of strings for display for an individuals pathogenic alleles.
      Returns a 5-element array. We could transform to a DTO (todo)  */
  getAlleleDisplay(key: string, count: number): string[] {
    const cohort = this.cohortData();
    let symbol = 'na';
    let transcript = 'na';
    let allele = 'na';
    let allelecount = 'na';
    if (cohort != null) {
      const hgvs = cohort.hgvsVariants[key];
      const sv = cohort.structuralVariants[key];
      allelecount = `n=${count}`;
      if (hgvs) {
        symbol = hgvs.symbol;
        transcript = hgvs.transcript;
        allele = hgvs.hgvs;
      } else if (sv) {
        symbol = sv.geneSymbol;
        transcript = 'na';
        allele = sv.label;
      }
    }
    return [allele, symbol, transcript, allelecount, key];
  }

  shortAlleleDisplayByKey = computed(() => {
    const cohort = this.cohortService.cohortData();
    if (!cohort || cohort.diseaseList.length === 0) {
      return new Map<string, string>();
    }
    const map = new Map<string, string>();
    for (const [key, hgvs] of Object.entries(cohort.hgvsVariants)) {
      map.set(key, hgvs.hgvs);
    }
    for (const [key, sv] of Object.entries(cohort.structuralVariants)) {
      map.set(key, sv.label);
    }
    for (const [key, ig] of Object.entries(cohort.intergenicVariants ?? {})) {
      map.set(key, ig.gHgvs ?? key);
    }
    return map;
  });

  diseaseLabelById = computed(() => {
    const cohort = this.cohortService.cohortData();
    if (!cohort || cohort.diseaseList.length === 0) {
      return new Map<string, string>();
    } else {
      return new Map(cohort.diseaseList.map((d) => [d.diseaseId, d.diseaseLabel]));
    }
  });

  onMoiChange(newMoiList: ModeOfInheritance[], diseaseIndex: number): void {
    const cohort = this.cohortData();
    if (!cohort) {
      return;
    }
    // Attach MOI to the correct disease
    const disease = cohort.diseaseList[diseaseIndex];
    if (!disease.modeOfInheritanceList) {
      disease.modeOfInheritanceList = [];
    }
    newMoiList.forEach((moi) => {
      disease.modeOfInheritanceList.push(moi);
    });
  }

  /**
   * Debug helper: returns human-readable differences between two values.
   */
  deepDiff(a: unknown, b: unknown, path: string[] = []): string[] {
    const diffs: string[] = [];
    // Case 1: both are non-null objects → recurse
    if (this.isRecord(a) && this.isRecord(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of keys) {
        diffs.push(...this.deepDiff(a[key], b[key], [...path, key]));
      }
      return diffs;
    }
    // Case 2: values differ (primitive or mismatched types)
    if (a !== b) {
      diffs.push(`${path.join('.')}: ${String(a)} → ${String(b)}`);
    }

    return diffs;
  }
  /* HELPER FOR ABOVE FUNCTION */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }




  async recordBiocuration(): Promise<void> {
    this.workflowService.recordBiocuration();
  }

  /** Calculate the columns we show if the user chooses to filter to a top-level term */
  visibleColumns = computed<number[]>(() => {
    const cohort = this.cohortData();
    if (!cohort) return [];
    if (cohort.rows.length < 1) return [];

    const row1 = cohort.rows[0];
    const n_cols = row1.hpoData.length;
    // Single-term filter takes priority when set
    const singleId = this.selectedSingleHpoId();
    if (singleId) {
      return cohort.hpoHeaders
        .map((header, i) => (header.hpoId === singleId ? i : -1))
        .filter((i) => i !== -1);
    }
    const selectedHpo = this.selectedTopLevelHpo();
    // if we have fewer than 20 columns, show all
    if (n_cols <= 20 || !selectedHpo) {
      return Array.from({ length: n_cols }, (_, i) => i);
    }
    const allowedTerms = this.hpoGroups().get(selectedHpo) ?? [];
    const allowedIds = allowedTerms.map((term) => term.hpoId);
    // Return indices of headers whose HPO ID is allowed
    return cohort.hpoHeaders
      .map((header, i) => (allowedIds.includes(header.hpoId) ? i : -1))
      .filter((i) => i !== -1);
  });

  visibleColumnMask = computed<Uint8Array>(() => {
    const cohort = this.cohortData();
    if (!cohort) return new Uint8Array();

    const n = cohort.hpoHeaders.length;
    const mask = new Uint8Array(n);

    for (const i of this.visibleColumns()) {
      mask[i] = 1;
    }
    return mask;
  });

  /* right click on first column can focus on row or PMIDs */
  onIndividualRightClick(event: MouseEvent, rowId: string): void {
    event.preventDefault(); // stop default menu of browser
    event.stopPropagation();
    console.log('[individual-rclick] fired for row', rowId);
    this.contextRowId = rowId;
    const { x, y } = this.configService.calculateMenuPosition(event.clientX, event.clientY);
    this.individualMenuX = x;
    this.individualMenuY = y;
    this.individualContextMenuVisible = true;
      console.log('[individual-rclick] set visible=true', { x, y });

  }

  // Just show the row that the user clicks on
  focusOnSingleRow(): void {
    if (!this.contextRowId) return;
    const row = this.rowMapById().get(this.contextRowId);
    if (!row) return;
    this.focusedRow.set(row);
    this.filterMode.set('single');
    this.contextMenuVisible = false;
    this.individualContextMenuVisible = false;
  }

  get contextRowPmid(): string | null {
    if (!this.contextRowId) return null;
    const row = this.rowMapById().get(this.contextRowId);
    return row?.individualData.pmid ?? null;
  }
  /** Focus on all rows with the same PMID */
  focusOnPmid(pmid: string | null): void {
    if (!pmid) return;
    this.focusedPmid.set(pmid);
    this.filterMode.set('pmid');
    this.individualContextMenuVisible = false;
  }

  showAllRows(): void {
    this.filterMode.set('all');
    this.focusedPmid.set('');
    this.individualContextMenuVisible = false;
  }

  filteredKeys = computed(() => {
    const frows = this.filteredRows().map((row) => this.getIndividualKey(row.individualData));
    return new Set(frows);
  });

  showInfoForRow(rowId: string | null, event: MouseEvent): void {
    this.individualContextMenuVisible = false;
    if (!rowId) {
      this.activeInfoRow.set(null);
      return;
    }
    const row = this.rowMapById().get(rowId);
    if (!row) {
      this.notificationService.showError('Cannot retrieve context row');
      this.activeInfoRow.set(null);
      return;
    }
    const pos = this.configService.calculateMenuPosition(event.clientX, event.clientY, 280, 350);

    this.infoMenuPos.set(pos);
    this.activeInfoRow.set(row);
    this.rowInfoKey = rowId;
  }

  closeRowInfo(): void {
    this.activeInfoRow.set(null);
    this.infoMenuPos.set(null);
  }

  getAlleleKeys(map: Record<string, unknown>): string[] {
    return Object.keys(map);
  }

  getIndividualKey(individual: IndividualData): string {
    return `${individual.pmid || 'NA'}-${individual.individualId || 'NA'}`;
  }

  hasObservedHpo(row: RowData): boolean {
    if (!row?.hpoData || row.hpoData.length === 0) {
      return false;
    }
    return row.hpoData.some((cell) => cell.type !== 'Excluded' && cell.type !== 'Na');
  }


  deleteRowId = signal<string|null>(null);
  deleteRowConfirmData = signal<ConfirmDialogData|null>(null);


  openDeleteRow(rowId: string | null): void {
    if (rowId === null){
      this.notificationService.showError("Attempt to delete row with null rowId");
      return;
    }
    this.deleteRowId.set(rowId);
    const data: ConfirmDialogData ={
      title: "Confirm Delete Row",
      message: `Delete row ${rowId}?`,
      helpTitle: "Delete row",
      helpLines: ["Click yes to remove the current row from the cohort"]
    };
    this.deleteRowConfirmData.set(data);      
  }

  handleDeleteRowConfirmation(confirmed: boolean): void {
    if (!confirmed) return;
    const currentCohort = this.cohortData();
    if (!currentCohort) return;
    const rowId = this.deleteRowId();
    if (rowId === null) {
      this.notificationService.showError("Could not find row id to delete");
      return;
    }
    const updatedRows = currentCohort.rows.filter((r) => getRowId(r.individualData) !== rowId);

    this.cohortService.setCohortData({
      ...currentCohort,
      rows: updatedRows,
    });
    this.deleteRowId.set(null);
    this.deleteRowConfirmData.set(null);
  }

  /* Get Links for display with summary of cohort */
  getGeneLinks(
    disease: DiseaseData,
  ): { symbol: string; hgncUrl: string; transcript: string; ncbiUrl: string }[] {
    if (!disease?.geneTranscriptList?.length) {
      return [];
    }

    return disease.geneTranscriptList.map((gene: GeneTranscriptData) => ({
      symbol: gene.geneSymbol,
      transcript: gene.transcript,
      hgncUrl: `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${gene.hgncId}`,
      ncbiUrl: `https://www.ncbi.nlm.nih.gov/nuccore/${gene.transcript}`,
    }));
  }

  async sortCohortRows(): Promise<void> {
    const dto = this.cohortData();
    if (!dto) return;
    const sorted_dto = await this.configService.sortCohortByrows(dto);
    this.cohortService.setCohortData(sorted_dto);
  }

  onHeaderMouseEnter(index: number): void {
    this.hoveredHpoHeader = index;
  }

  onHeaderMouseLeave(): void {
    this.hoveredHpoHeader = null;
  }

  // Helper to check if a header is hovered
  isHeaderHovered(index: number): boolean {
    return this.hoveredHpoHeader === index;
  }

  toggleAddAllelePopover(rowId: string, event: MouseEvent): void {
    event.stopPropagation(); // prevents the table row click from firing
    this.openAddAlleleRowId = this.openAddAlleleRowId === rowId ? null : rowId;
  }

  // Close after selecting an option
  closeAddAllelePopover(): void {
    this.openAddAlleleRowId = null;
  }

  async addAllCohortAges(): Promise<void> {
    const cohortData = this.cohortData();
    if (!cohortData) return;
    const cohortAges = await this.configService.getAllCohortAgeStrings(cohortData);
    this.ageService.addSelectedTerms(cohortAges);
  }

  /* Called when the user has changed something following a right-click on an HPO cell but not yet confirmed. */
  handleTableDataUpdate(updatedCellData: CellValue): void {
    this.interactionService.updateActiveCell(updatedCellData);
  }

  handleConfirm(ctx: TableContext) {
    const currentDto = this.cohortData();
    if (!currentDto) {
      this.notificationService.showError('Cohort data or row context missing.');
      return;
    }
    const finalValue = this.interactionService.getActivateCell();
    if (!finalValue) {
      this.notificationService.showError('Cell value was null');
      return;
    }
    const updatedCohort = this.updateHpoCell(currentDto, ctx.rowId, ctx.colIndex, finalValue);

    this.cohortService.setCohortData(updatedCohort);
    this.interactionService.close();
  }

  /* reset of the Moi/acronym componet */
  handleReset(): void {
    const current = this.cohortData();
    if (!current) return;

    // We create a deep-ish copy of the metadata while keeping individual rows intact
    const resetCohort: CohortData = {
      ...current,
      cohortAcronym: '',
      // Map over diseases to clear their specific inheritance lists
      diseaseList: current.diseaseList.map((disease) => ({
        ...disease,
        modeOfInheritanceList: [],
      })),
    };

    this.cohortService.setCohortData(resetCohort);
    this.notificationService.showSuccess('Cohort metadata has been reset.');
  }

  /* Set the cohort acronym */
  handleAcronym(newAcronym: string): void {
    const current = this.cohortData();
    if (!current) return;

    this.cohortService.setCohortData({
      ...current,
      cohortAcronym: newAcronym,
    });
  }

  handleMoi(event: { diseaseIndex: number; moi: ModeOfInheritance[] }): void {
    const current = this.cohortData();
    if (!current) return;
    const updatedDiseases = current.diseaseList.map((d, index) => {
      if (index === event.diseaseIndex) {
        return {
          ...d,
          modeOfInheritanceList: [...event.moi],
        };
      }
      return d;
    });
    this.cohortService.setCohortData({
      ...current,
      diseaseList: updatedDiseases,
    });
  }

  async openPmidInBrowser(pmid: string | null): Promise<void> {
    if (!pmid) return;
    const cleanId = pmid.replace(/pmid:/i, '').trim();
    if (cleanId) {
      const url = `https://pubmed.ncbi.nlm.nih.gov/${cleanId}/`;
      await openUrl(url);
    }
  }

  protected activeContextForAge = signal<TableContext | null>(null);
  activeAgeString = computed(() => {
    const ctx = this.activeContextForAge();
    if (!ctx) return '';
    let cellVal: CellValue = ctx.cell;
    if (cellVal.type == 'OnsetAge') {
      return cellVal.data;
    } else {
      return '';
    }
  });

  openGlobalAgeDialog(context: TableContext) {
    this.showAgeDialog.set(true);
    this.activeContextForAge.set(context);
  }

  handleAgeSaved(newOnset: string) {
    const ctx = this.activeContextForAge();
    if (!ctx) {
      this.notificationService.showError('Attempt to update age without active Age context');
      return;
    }
    const cohort = this.cohortService.cohortData();
    if (!cohort) {
      return;
    }
    const { colIndex, rowId, cell } = ctx;
    let updatedCell: CellValue = {
      ...cell,
      type: 'OnsetAge',
      data: newOnset,
    };
    this.updateHpoCell(cohort, rowId, colIndex, updatedCell);
    this.interactionService.updateActiveCell(updatedCell);
    this.notificationService.showSuccess(`Updated to ${newOnset}`);
    this.activeContextForAge.set(null);
    this.showAgeDialog.set(false);
  }

  closeAgeDialog() {
    this.showAgeDialog.set(false);
  }
  
  hasExtraInfo(cell: CellValue): boolean {
    return cell.type === 'OnsetAge' || !!cell.modifiers?.length;
  }

  onTopLevelFilterChange(value: string) {
    this.selectedSingleHpoId.set(null);
    this.selectedTopLevelHpo.set(value || null);
  }

  private readonly ontologyAutocomplete = viewChild<OntologyAutocompleteComponent>('singleTermAutocomplete');

  /* Set or clear the "single-term" column selection */
  onSingleTermSelected(match: OntologyMatch | null) {
    this.selectedTopLevelHpo.set(null);
    this.selectedSingleHpoId.set(match ? match.id : null);
    this.ontologyAutocomplete()?.clear();
  }

  /** Terms available for the single-term filter, derived from the current cohort's columns */
  availableHpoTerms = computed(() => {
    const cohort = this.cohortData();
    if (!cohort) return [];
    return cohort.hpoHeaders.map((h) => ({ hpoId: h.hpoId, label: h.hpoLabel }));
  });
  /* Just provide autocomplete for the terms that are already being used for curation. */
  localAutocompleteProvider = (query: string): Observable<OntologyMatch[]> => {
    const q = query.toLowerCase();
    const matches = this.availableHpoTerms()
      .filter((t) => t.label.toLowerCase().includes(q) || t.hpoId.toLowerCase().includes(q))
      .map((t): OntologyMatch => ({
        id: t.hpoId,
        label: t.label,
        matchedText: query
      }));
    return of(matches);
  };
}
