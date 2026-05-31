import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { SourcePmid } from '../../models/cohort_description_dto';


@Component({
  selector: 'app-pmid-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './pmid-dialog.component.html',
  styleUrls: ['./pmid-dialog.component.scss']
})
export class PmidDialogComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public data: { citations: SourcePmid[] }) {}

  getPmid(item: SourcePmid) {
    const pmid = item.pmid;
    return pmid.split(":")[1]
  }
}