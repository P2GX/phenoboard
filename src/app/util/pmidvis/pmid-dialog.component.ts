import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SourcePmid } from '@workspace/ui';


@Component({
  selector: 'app-pmid-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pmid-dialog.component.html',
  styleUrls: ['./pmid-dialog.component.scss']
})
export class PmidDialogComponent {

  citations = input.required<SourcePmid[]>();


  getPmid(item: SourcePmid) {
    const pmid = item.pmid;
    return pmid.split(":")[1]
  }
}