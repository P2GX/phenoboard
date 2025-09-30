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
import { VariantDto, VariantType } from '../models/variant_dto';
import { CohortData } from '../models/cohort_dto';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';




/*
      <th class="border border-gray-400 px-4 py-2">Variant String</th>
      <th class="border border-gray-400 px-4 py-2">Variant Consequence</th>
      <th class="border border-gray-400 px-4 py-2">Count</th>
       <th class="border border-gray-400 px-4 py-2">Category</th>
      <th class="border border-gray-400 px-4 py-2">Validated?</th>
      */

export interface VariantDisplay {
  /** either an HGVS String (e.g., c.123T>G) or a SV String: DEL: deletion of exon 5 */
  variantString: string;
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
    private configService: ConfigService, 
    override cohortService: CohortDtoService,
    ngZone: NgZone, 
    override cdRef: ChangeDetectorRef) {
      super(cohortService, ngZone, cdRef)
    }

  errorMessage: string | null = null;
  variantDtoList: VariantDto[] | [] = [];

  variantDisplayList: VariantDisplay[] = [];
  
  protected override onCohortDtoLoaded(template: CohortData): void {
      /* no op */
    }
  override async ngOnInit() {
    super.ngOnInit();
    try {
      const cohort = this.cohortService.getCohortData();
      if (cohort != null) {
        this.initVariantDisplay(cohort);
      }
    } catch (err) {
      this.errorMessage = String(err);
    }
  }


  initVariantDisplay(cohort: CohortData) {
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
        consequence: hgvs.pHgvs || "n/a",  
        variantType: "HGVS",      
        isValidated: true,       
        count: rowToKeyMap[vkey] || 0,  
      };
      this.variantDisplayList.push(display);
      validatedKeys.add(vkey);
    });
     Object.entries(cohort.structuralVariants).forEach(([vkey, sv]) => {
      const display: VariantDisplay = {
        variantString: sv.label,  
        consequence: "structural",  
        variantType: sv.svType,      
        isValidated: true,       
        count: rowToKeyMap[vkey] || 0,  
      };
      this.variantDisplayList.push(display);
      validatedKeys.add(vkey);
    });
    Object.entries(rowToKeyMap).forEach(([vkey, count]) => {
      if (!validatedKeys.has(vkey)) {
        const display: VariantDisplay = {
          variantString: vkey,   
          consequence: "unknown",
          variantType: "UNKNOWN",
          isValidated: false,
          count,
        };
      this.variantDisplayList.push(display);
    }
  });

  }

  override ngOnDestroy() {
    super.ngOnDestroy();
  }

  /** The user clicks on the button to validate a single variant. We therefore send the variant to the back end, where the resulting
   * validated variant is added back to the CohortDto. If successful, we update the cohort Dto in the backend and update it in our service
   */
  validateVariant(varDto: VariantDisplay) {
    throw new Error('validateVariant not implemented.');
  }

  
    
}

