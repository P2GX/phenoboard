import { inject, Injectable } from '@angular/core';
import { ConfigService } from './config.service';
import { CohortDtoService } from './cohort_dto_service';
import { NotificationService } from 'ng-hpo-uikit';
import { CohortData, createCurationEvent } from '@workspace/ui';
import { WorkflowError } from './cohort-workflow.errors';

@Injectable({ providedIn: 'root' })
export class CohortWorkflowService {
  private configService = inject(ConfigService);
  private cohortService = inject(CohortDtoService);
  private notificationService = inject(NotificationService);

  async validateCohort(cohort: CohortData | null): Promise<void> {
    if (!cohort) {
      throw new WorkflowError('NOT_INITIALIZED', 'Cohort DTO not initialized');
    }

    try {
      await this.configService.validateCohort(cohort);
      this.notificationService.showSuccess('✅ Cohort successfully validated');
    } catch (err) {
      // Log it, show the error, then re-throw for the component to handle the dialog
      this.notificationService.showError('❌ Validation failed: ' + err);
      throw new WorkflowError('VALIDATION_FAILED', String(err));
    }
  }

  /** Remove ontological conflicts and redundancies */
  async sanitizeCohort(cohort: CohortData): Promise<void> {
    const sanitized = await this.configService.sanitizeCohort(cohort);
    this.cohortService.setCohortData(sanitized);
  }

  async save(cohort: CohortData): Promise<void> {
    const hasMoiError = cohort.diseaseList.some((d) => d.modeOfInheritanceList.length === 0);
    if (hasMoiError) {
      this.notificationService.showError('Missing Mode of Inheritance');
      return;
    }
    await this.configService.saveCohort(cohort);
  }

  async saveCohort(cohort: CohortData | null): Promise<void> {
    if (!cohort) {
      throw new WorkflowError('NOT_INITIALIZED', 'Cannot save null cohort');
    }

    if (!cohort.cohortAcronym) {
      throw new WorkflowError('MISSING_ACRONYM', 'Need to specify acronym before saving');
    }

    // check for MOI in all diseases
    const invalidDisease = cohort.diseaseList.find((d) => d.modeOfInheritanceList.length === 0);
    if (invalidDisease) {
      throw new WorkflowError(
        'MISSING_MOI',
        `No mode of inheritance specified for ${invalidDisease.diseaseLabel}`,
      );
    }
    await this.configService.saveCohort(cohort);
  }

  async recordBiocuration(): Promise<void> {
    const orcid = await this.configService.getCurrentOrcid();
    if (!orcid) {
      this.notificationService.showError('Could not retrieve ORCID id');
      return;
    }
    const event = createCurationEvent(orcid);
    if (
      this.cohortService
        .getCurationHistory()
        .some((e) => e.orcid === event.orcid && e.date === event.date)
    ) {
      this.notificationService.showWarning('Event already recorded.');
      return;
    }
    this.cohortService.addBiocuration(event);
    this.notificationService.showSuccess(`Added biocuration event`);
  }
}
