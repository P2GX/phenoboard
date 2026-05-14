import { Component, computed, HostListener, inject, OnDestroy, OnInit, signal, Signal } from '@angular/core';

import { MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData } from '../models/cohort_dto';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from "@angular/material/icon";
import {  ColumnTableDto, EtlCellStatus,  EtlDto, fromColumnDto } from '../models/etl_dto';
import { EtlSessionService } from '../services/etl_session_service';
import { NotificationService } from '../services/notification.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';
import { PubmedComponent } from '../pubmed/pubmed.component';
import { Router } from '@angular/router';
import { HelpButtonComponent } from "../util/helpbutton/help-button.component";
import { AppStatusService } from '../services/app_status_service';

export const RAW: EtlCellStatus = 'raw' as EtlCellStatus;
export const TRANSFORMED: EtlCellStatus = 'transformed' as EtlCellStatus;
export const ERROR: EtlCellStatus = 'error' as EtlCellStatus;



/**
 * Component for editing external Excel tables (e.g., supplemental files). The external tables are assumed to have lines or columns
 * that represent the attributes of an individual. The logic of the component is that the user transforms the tables one column
 * at a time.
 */
@Component({
  selector: 'app-table-editor-header',
  standalone: true,
  imports: [MatTableModule, MatIconModule, FormsModule, MatTooltipModule, ReactiveFormsModule, HelpButtonComponent],
  templateUrl: './table-editor-header.html',
  styleUrls: ['./table-editor-header.scss'],
})
export class TableEditorHeader implements OnInit {

    public statusService = inject(AppStatusService);
    private cohortService = inject(CohortDtoService);
    private configService = inject(ConfigService);
    private notificationService = inject(NotificationService);
    public etl_service = inject(EtlSessionService);
    diseaseDataSignal = signal<DiseaseData | null>(null);
    private dialog = inject(MatDialog);
    pmidForm: FormGroup;
    private fb = inject(FormBuilder);
    private router = inject(Router);

    constructor() {
        this.pmidForm = this.fb.group({
            pmid: [defaultPmidDto()],
        });
    }
    
    ngOnInit(): void {
        this.importCohortDiseaseData();
    }


    importCohortDiseaseData(): void {
        const cohort = this.cohortService.getCohortData();
        if (cohort == null) return;
        if (cohort.cohortType != 'mendelian') {
            this.notificationService.showError(`External ETL only available for mendelian but you tried ${cohort.cohortType}`);
            return;
        }
        if (cohort.diseaseList.length != 1) {
            this.notificationService.showError(`External ETL only available for mendelian but you had ${cohort.diseaseList.length} DiseaseData objects`);
            return;
        }
        const ddata = cohort.diseaseList[0];
        this.diseaseDataSignal.set(ddata);
        this.notificationService.showSuccess("Imported cohort data");
    }


    /* Load an external Excel file (e.g., supplemental table from a publication). 
    * We support column (individuals incolumns) or row (individuals iun rows) and normalize such that the 
    * individuals are in rows. */
    async loadExcel(rowBased: boolean = false) {
        const diseaseData = this.diseaseDataSignal();
        if (! diseaseData) {
            this.notificationService.showError("Could not retrieve disease data. Have you loaded a cohort?");
            return;
        }
        try {
            const table: ColumnTableDto | null = rowBased
                ? await this.configService.loadExternalExcelRowBased()
                : await this.configService.loadExternalExcel();

            if (!table) {
                this.notificationService.showError("Could not retrieve external table");
                return;
            }
            const dto = fromColumnDto(table);
            this.etl_service.setEtlDto(dto);
            this.etl_service.setDisease(diseaseData);
        } catch (error) {
            this.notificationService.showError(`Could not retrieve external table: ${error}.`);
        }
    }


    /**
     * Save the current template data to file
     */
    async saveExternalTemplateJson(): Promise<void> {
        const etlDto = this.etl_service.etlDto();
        if (! etlDto) {
            this.notificationService.showError("Could not save JSON because data table is not initialized");
            return;
        }
        if (etlDto.disease == null) {
            this.notificationService.showError("Could not save JSON because disease data is not initialized");
            return;
        }
        if (etlDto.disease.geneTranscriptList.length == 0) {
            this.notificationService.showError("Empty geneTranscriptList");
            return;
        }
        if (etlDto.disease.geneTranscriptList.length > 1) {
            this.notificationService.showError("Unexpected length of geneTranscriptList > 1");
            return;
        }
        const gt = etlDto.disease.geneTranscriptList[0];
        if (gt == null) {
            this.notificationService.showError("geneTranscript. was null");
            return;
        }
        const validationError = this.etl_service.validateEtlDto(etlDto);
        if (validationError) {
            this.notificationService.showError(`Validation failed: ${validationError}`);
            return;
        }
        this.configService.saveJsonExternalTemplate(etlDto)
    }



    /**
     * Load a template data from file (usually this means we previously 
     * saved an intermediate result and now want to continue work)
     */
    async loadExternalTemplateJson(): Promise<void> {
        try {
            const dto: EtlDto = await this.configService.loadJsonExternalTemplate();
            
            if (!dto) {
                this.notificationService.showError("Could not retrieve external template json");
                return;
            }

            this.etl_service.setEtlDto(dto);
            this.validateDiseaseContext(dto);

        } catch (error) {
            this.notificationService.showError(`Could not load external JSON template: ${error}.`);
        }
    }

    /**
     * Handles the edge-case validation between the loaded ETL data and the current session/cohort state.
     */
    private validateDiseaseContext(dto: EtlDto): void {
        const etlDiseaseId = dto.disease?.diseaseId;
        const previousCohort = this.cohortService.getCohortData();

        // Case 1: ETL file contains disease data
        if (etlDiseaseId) {
            const previousDiseaseId = previousCohort?.diseaseList?.[0]?.diseaseId;
            
            if (previousDiseaseId && previousDiseaseId !== etlDiseaseId) {
                this.notificationService.showError(
                    `ETL disease ${etlDiseaseId} differs from current cohort disease ${previousDiseaseId}`
                );
            }
            return;
        }

        // Case 2: ETL file is missing disease data
        const currentDisease = this.diseaseDataSignal();
        if (currentDisease) {
            this.notificationService.showWarning(
                `Using disease data from session ${currentDisease.diseaseLabel} (${currentDisease.diseaseId})`
            );
        } else {
            this.notificationService.showWarning("Missing disease data. Create the cohort and reload the ETL file");
        }
    }




    /** Add the PMID to the ETL DTO; open a modal dialog with our PMID widget */
    openPubmedDialog(): void {
        const dto = this.etl_service.etlDto();
        const dialogRef = this.dialog.open(PubmedComponent, {
        width: '600px',
        data: { pmidDto: null } 
        });

        dialogRef.afterClosed().subscribe((result: PmidDto | null) => {
        if (result && dto ) {
            const pmidDto = result;
            this.etl_service.setPmidData(pmidDto);
        } else {
            this.notificationService.showWarning("PMID import cancelled");
        }
        });
    }


/** Add the data from the external data to the current CohortData object. If there is no
     * current CohortData object, then initialize it. If there is an error in the ETL data, do nothing
     * except for showing the error.
     */
  async addToCohortData(): Promise<void> {
    const dto = this.etl_service.etlDto();
    if (dto == null) {
      this.notificationService.showError("Could not create CohortData because etlDto was not initialized");
      return;
    }
    const cohort_previous = this.cohortService.getCohortData();
    try { 
      const cohort_dto_new = await this.configService.transformToCohortData(dto);
      // i.e., the previous cohort has patient data
      if (cohort_previous && cohort_previous.rows.length > 0) {
        const merged_cohort = await this.configService.mergeCohortData(cohort_previous, cohort_dto_new);
        this.cohortService.setCohortData(merged_cohort);
      } else {
        // If we are creating a new cohort, the previous cohort will be empty (zero rows)
        // but it should still contain the cohort acronym
        if (cohort_previous?.cohortAcronym) {
          const acronym = cohort_previous.cohortAcronym ?? '';
          cohort_dto_new.cohortAcronym = acronym;
        }
        this.cohortService.setCohortData(cohort_dto_new);
      }
      this.etl_service.clearEtlDto();
      this.router.navigate(['/pttemplate']);
    } catch (err: unknown) {
      this.notificationService.showError(
        `addToCohortData-error-Could not create CohortData: ${err instanceof Error ? err.message : err}`
      );
    }
  }

}