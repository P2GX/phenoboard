import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CohortDtoService } from '../services/cohort_dto_service';
import { StructuralVariant, VariantDto, VariantType } from '../models/variant_dto';
import { CohortData } from '../models/cohort_dto';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { NotificationService } from '../services/notification.service';
import { SvDialogService } from '../services/svManualEntryDialogService';
import { GeneTranscriptData } from '../models/cohort_dto';

export interface VariantDisplay {
  /** either an HGVS String (e.g., c.123T>G) or a SV String: DEL: deletion of exon 5 */
  variantString: string;
  /** Key used in maps */
  variantKey: string;
  /** Key to be used in the HashMap */
  consequence: string;
  /** type of variant category */
  variantType: VariantType;
  /** Was this variant validated in the backend? */
  isValidated: boolean;
  /** How many alleles were reported with this variant in the cohort? */
  count: number;
}


@Component({
  selector: 'app-variant_list',
  standalone: true,
  imports:[CommonModule, FormsModule, MatButtonModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatSelectModule],
  templateUrl: './variant_list.component.html',
  styleUrls: ['./variant_list.component.css']
})
export class VariantListComponent extends TemplateBaseComponent implements OnInit, OnDestroy {

  constructor(
    override cohortService: CohortDtoService,
    private notificationService: NotificationService,
    private svDialog: SvDialogService,
    ngZone: NgZone, 
    override cdRef: ChangeDetectorRef) {
      super(cohortService, ngZone, cdRef)
    }

  errorMessage: string | null = null;

  variantDisplayList: VariantDisplay[] = [];
  
  protected override onCohortDtoLoaded(template: CohortData): void {
      /* no op */
    }
  override async ngOnInit() {
    super.ngOnInit();
    this.initVariantDisplay();
  }


  initVariantDisplay() {
    const cohort = this.cohortService.getCohortData();
    if (! cohort) {
      this.notificationService.showError("Cohort nit initialized");
      return;
    }
    let varDisplayList: VariantDisplay[] = [];
    const rowToKeyMap: { [key: string]: number } = {};
    const validatedKeys = new Set<string>();
    cohort.rows.forEach((row) => {
      Object.entries(row.alleleCountMap).forEach(([allele, count]) => {
        // accumulate into rowToKeyMap
        rowToKeyMap[allele] = (rowToKeyMap[allele] ?? 0) + count;
      });
    });

    Object.entries(cohort.hgvsVariants).forEach(([vkey, hgvs]) => {
      const display: VariantDisplay = {
        variantString: hgvs.hgvs,  
        variantKey: hgvs.variantKey,
        consequence: hgvs.pHgvs || "n/a",  
        variantType: "HGVS",      
        isValidated: true,       
        count: rowToKeyMap[vkey] || 0,  
      };
      varDisplayList.push(display);
      validatedKeys.add(vkey);
    });
     Object.entries(cohort.structuralVariants).forEach(([vkey, sv]) => {
      const display: VariantDisplay = {
        variantString: sv.label,  
        variantKey: sv.variantKey,
        consequence: "structural",  
        variantType: sv.svType,      
        isValidated: true,       
        count: rowToKeyMap[vkey] || 0,  
      };
      varDisplayList.push(display);
      validatedKeys.add(vkey);
    });
    Object.entries(rowToKeyMap).forEach(([vkey, count]) => {
      if (!validatedKeys.has(vkey)) {
        const display: VariantDisplay = {
          variantString: vkey,   
          variantKey: vkey,
          consequence: "unknown",
          variantType: "UNKNOWN",
          isValidated: false,
          count,
        };
      varDisplayList.push(display);
    }
  });
  this.variantDisplayList = varDisplayList;
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
  }

  /** The user clicks on the button to validate a single variant. We therefore send the variant to the back end, where the resulting
   * validated variant is added back to the CohortDto. If successful, we update the cohort Dto in the backend and update it in our service
   */
  deleteVariant(varDto: VariantDisplay) {
    let cohort = this.cohortService.getCohortData();
    if (! cohort) {
      this.notificationService.showError("Cohort not initialized");
      return;
    }
    const variant = varDto.variantKey;
    if (variant in cohort.hgvsVariants) {
      delete cohort.hgvsVariants[variant];
      this.cohortService.setCohortData(cohort);
      this.updateView();
      this.notificationService.showSuccess(`Removed variant: ${variant}`);
    } else if (variant in cohort.structuralVariants){
      delete cohort.structuralVariants[variant];
      this.cohortService.setCohortData(cohort);
      this.updateView();
      this.notificationService.showSuccess(`Removed structural variant: ${variant}`);
    } else {
      this.notificationService.showError(`Did not find variant key ${variant}`)
    }
  }

  /**
   * Refreshes the component's display list and forces Angular change detection.
   */
  private updateView(): void {
    // 1. Clear the old list
    this.variantDisplayList = []; 
    
    // 2. Re-populate the list based on the new cohort data
    this.initVariantDisplay(); 
    
    // 3. Force change detection (optional, but good practice when component state changes
    //    asynchronously or outside standard input/output bindings)
    this.cdRef.detectChanges();
  }

  async editSv(variant: VariantDisplay) {
    if ( variant.variantType === "HGVS") {
      this.notificationService.showError("Cannot apply structural variant editing to HGVS");
      return;
    }
    const svKey = variant.variantKey;
    const cohort = this.cohortService.getCohortData();
    if (! cohort) {
      this.notificationService.showError("Cohort not initialized");
      return;
    }
    const currentSv = cohort.structuralVariants[svKey];
    if (!currentSv) {
      this.notificationService.showError(`Could not retrieve data for SV ${svKey}`);
      return;
    }
    const gtdata: GeneTranscriptData = {
      hgncId: currentSv.hgncId,
      geneSymbol: currentSv.geneSymbol,
      transcript: currentSv.transcript
    };
    try{
          const sv: StructuralVariant | null = await this.svDialog.openSvDialog(gtdata, variant.variantString, currentSv.chromosome);
          
          if (sv) {
            if (sv.variantKey !== svKey) {
                // 2. Remove the old entry from the map
                delete cohort.structuralVariants[svKey];
            }
            cohort.structuralVariants[sv.variantKey] = sv;
            this.cohortService.updateSv(cohort, svKey, sv.variantKey);
            this.updateView();
            this.cdRef.detectChanges();
            this.notificationService.showSuccess(`Structural variant ${svKey} updated to ${sv.variantKey}`);
          }
        } catch (error) {
          const errMsg = String(error);
          this.notificationService.showError(errMsg);
        }
  }
  
    
}

