import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CohortDtoService } from '../services/cohort_dto_service';
import { StructuralVariant, VariantType } from '../models/variant_dto';
import { NotificationService } from '../services/notification.service';
import { SvDialogService } from '../services/svManualEntryDialogService';
import { GeneTranscriptData } from '../models/cohort_dto';
import { HelpService } from '../services/help.service';
import { HelpButtonComponent } from "../util/helpbutton/help-button.component";

export interface VariantDisplay {
  /** either an HGVS String (e.g., c.123T>G) or a SV String: DEL: deletion of exon 5 */
  variantString: string;
  /** Key used in maps */
  variantKey: string;
  /** Gene of reference */
  geneSymbol: string;
  /** Transcript, if available (it may not be available for mitochondrial or intergenic variants) */
  transcript?: string;
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
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, HelpButtonComponent],
  templateUrl: './variant_list.component.html',
  styleUrls: ['./variant_list.component.css']
})
export class VariantListComponent implements OnInit, OnDestroy {


  private cohortService = inject(CohortDtoService);
  private helpService = inject(HelpService);
  private notificationService = inject(NotificationService);
  private svDialog = inject(SvDialogService);

  errorMessage: string | null = null;

  cohortData = this.cohortService.cohortData;

  readonly variantDisplayList = computed(() => {
    const cohort = this.cohortData(); 
    if (!cohort) return [];

    const varDisplayList: VariantDisplay[] = [];
    const rowToKeyMap: Record<string, number> = {};
    const validatedKeys = new Set<string>();

    // 1. Aggregate counts from all rows
    cohort.rows.forEach(row => {
      Object.entries(row.alleleCountMap).forEach(([allele, count]) => {
        rowToKeyMap[allele] = (rowToKeyMap[allele] ?? 0) + count;
      });
    });

    // 2. Process HGVS
    Object.entries(cohort.hgvsVariants).forEach(([vkey, hgvs]) => {
      varDisplayList.push({
        variantString: hgvs.hgvs,
        variantKey: hgvs.variantKey,
        consequence: hgvs.pHgvs || "n/a",
        variantType: "HGVS" as VariantType,
        isValidated: true,
        count: rowToKeyMap[vkey] || 0,
        geneSymbol: hgvs.symbol,
        transcript: hgvs.transcript
      });
      validatedKeys.add(vkey);
    });

    // 3. Process Structural Variants
    Object.entries(cohort.structuralVariants).forEach(([vkey, sv]) => {
      varDisplayList.push({
        variantString: sv.label,
        variantKey: sv.variantKey,
        consequence: "structural",
        variantType: sv.svType,
        isValidated: true,
        count: rowToKeyMap[vkey] || 0,
        geneSymbol: sv.geneSymbol,
        transcript: sv.transcript
      });
      validatedKeys.add(vkey);
    });

    // 4. Handle "Unknown/Not Validated" (keys in rows but not in variant maps)
    Object.entries(rowToKeyMap).forEach(([vkey, count]) => {
      if (!validatedKeys.has(vkey)) {
        varDisplayList.push({
          variantString: vkey,
          variantKey: vkey,
          consequence: "unknown",
          variantType: "UNKNOWN" as VariantType,
          isValidated: false,
          count,
          geneSymbol: 'n/a'
        });
      }
    });

    return varDisplayList;
  });
  
  async ngOnInit(): Promise<void> {
    this.helpService.setHelpContext("variant")
  }


   ngOnDestroy(): void {
  }

  /** The user clicks on the button to validate a single variant. We therefore send the variant to the back end, where the resulting
   * validated variant is added back to the CohortDto. If successful, we update the cohort Dto in the backend and update it in our service
   */
  deleteVariant(varDto: VariantDisplay): void {
    const cohort = this.cohortData();
    if (! cohort) {
      this.notificationService.showError("Cohort not initialized");
      return;
    }
    const variantKey = varDto.variantKey;
    const newCohort = {...cohort};
    if (variantKey in cohort.hgvsVariants) {
      delete newCohort.hgvsVariants[variantKey];
      this.cohortService.setCohortData(newCohort);
      this.notificationService.showSuccess(`Removed variant: ${variantKey}`);
    } else if (variantKey in cohort.structuralVariants){
      delete newCohort.structuralVariants[variantKey];
      this.cohortService.setCohortData(newCohort);
      this.notificationService.showSuccess(`Removed structural variant: ${variantKey}`);
    } else {
      this.notificationService.showError(`Did not find variant key ${variantKey}`)
    }
  }

 

  async editSv(variant: VariantDisplay): Promise<void> {
    const cohort = this.cohortData();

    if (! cohort || variant.variantType === "HGVS") {
      // Should never happen!
      return;
    }
    const svKey = variant.variantKey;
   
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
          const result = await this.svDialog.openSvDialog(gtdata, variant.variantString, currentSv.chromosome);
          if (result) {
            this.cohortService.updateSv(cohort, svKey, result.variantKey);
            this.notificationService.showSuccess(`Structural variant ${svKey} updated to ${result.variantKey}`);
          }
        } catch (error) {
          this.notificationService.showError(String(error));
        }
  }
  
    
}

