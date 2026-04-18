import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { CohortDtoService } from '../services/cohort_dto_service';
import { DiseaseData } from '../models/cohort_dto';
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from '@angular/router'; 
import { SourcePmid } from '../models/cohort_description_dto';
import { RepoErrorType, RepoQc } from '../models/repo_qc';
import { NotificationService } from '../services/notification.service';
import { HelpService } from '../services/help.service';
import { HelpButtonComponent } from "../util/helpbutton/help-button.component";
import { CompareDialogComponent, CompareFiles } from '../util/comparewidget/comparewidget';
import { MatDialog } from '@angular/material/dialog';
import { ComparisonReport } from '../models/comparison';

@Component({
  selector: 'app-status',
  templateUrl: './qc.component.html',
  styleUrls: ['./qc.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule, HelpButtonComponent],
})
export class QcComponent implements OnInit {

  private configService = inject(ConfigService); 
  private helpService = inject(HelpService);
  private notificationService = inject(NotificationService);
  private dialog = inject(MatDialog);
  copySuccess = signal(false);
  
  ngOnInit(): void {
    this.helpService.setHelpContext("repo");
  }
  
  diseaseList!: DiseaseData[];
  pmidList: SourcePmid[] = [];
  showPmid = false;
  showJson = false;

  repoQc: RepoQc | null = null;
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  comparisonFiles = signal<CompareFiles | null>(null);
  comparisonResult = signal<ComparisonReport | null>(null);

  // A computed signal to quickly check if the files are identical
  isIdentical = computed(() => {
    const report = this.comparisonResult();
    if (!report) return false;
    
    return report.idMatch && 
           report.addedHpo.length === 0 && 
           report.removedHpo.length === 0 &&
           report.addedVariants.length === 0 &&
           report.removedVariants.length === 0;
  });

  async fetchRepoQc(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.repoQc = await this.configService.fetchRepoQc();
    } catch (err: unknown) {
      this.notificationService.showError(`Could not load QC data: ${err instanceof Error ? err: String(err)}`)
    }
  }

  errorTypeLabel(type: RepoErrorType): string {
  switch (type) {
    case 'unexpectedFile':
      return 'Unexpected file';
    case 'moiMismatch':
      return 'MOI mismatch';
    case 'ppktExportError':
      return 'Export error';
    case 'noHpoTermError':
      return 'No HPO terms';
    default:
      return 'Unknown';
  }
}

errorTypeClass(type: RepoErrorType): string {
  switch (type) {
    case 'unexpectedFile':
      return 'status-pill-warn';
    case 'moiMismatch':
      return 'status-pill-err';
    case 'ppktExportError':
      return 'status-pill-err';
    case 'noHpoTermError':
      return 'status-pill-warn';
    default:
      return 'status-pill-neutral';
  }
}

  openCompareDialog() {
    const dialogRef = this.dialog.open(CompareDialogComponent, {
        width: '450px',
      });

    dialogRef.componentInstance.compareRequested.subscribe((files: CompareFiles) => {
      this.comparisonFiles.set(files); // Store the paths
      this.runComparison();            // Trigger the logic
      dialogRef.close();
    });

    dialogRef.componentInstance.cancelRequested.subscribe(() => dialogRef.close());
  }

  async runComparison() {
    const files = this.comparisonFiles();
    if (!files) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const report = await this.configService.compareTwoPhenopackets(files.path1, files.path2);
      this.comparisonResult.set(report);
      console.log(report);
    } catch (err) {
      this.errorMessage.set('Failed to compare phenopackets.');
      this.notificationService.showError(`Failed to compare phenopackets: ${err}.`)
       this.comparisonResult.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async copyReportToClipboard() {
    const report = this.comparisonResult();
    if (!report) return;
    try {
      const jsonString = JSON.stringify(report, null, 2);
      // Use the standard Web Clipboard API
      await navigator.clipboard.writeText(jsonString);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  }

}