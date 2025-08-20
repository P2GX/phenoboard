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
import { VariantDto } from '../models/variant_dto';
import { CohortDto } from '../models/cohort_dto';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';


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
  
  protected override onCohortDtoLoaded(template: CohortDto): void {
      /* no op */
    }
  override async ngOnInit() {
    super.ngOnInit();
    try {
      const cohort = this.cohortService.getCohortDto();
      if (cohort != null) {
        this.variantDtoList = await this.configService.getVariantAnalysis(cohort);
      }
    } catch (err) {
      this.errorMessage = String(err);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
  }

  /** The user clicks on the button to validate a single variant. We therefore send the variant to the back end, where the resulting
   * validated variant is added back to the CohortDto. If successful, we update the cohort Dto in the backend and update it in our service
   */
  validateVariant(varDto: VariantDto) {
    throw new Error('validateVariant not implemented.');
  }
    
}

