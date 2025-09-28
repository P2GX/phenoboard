// variant-dialog.service.ts
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { StructuralVariant, SvType } from '../models/variant_dto';
import { firstValueFrom } from 'rxjs';
import { ManualStructuralVariantDialog } from '../manualsv/manual-sv.component'
import { GeneTranscriptData } from '../models/cohort_dto';

@Injectable({ providedIn: 'root' })
export class SvDialogService {
  constructor(private dialog: MatDialog) {}

  async openSvDialog(
    gt: GeneTranscriptData, 
    cell_contents: string,
    chr: string): Promise<StructuralVariant | null> {

    const data: StructuralVariant = {
        label: cell_contents,
        geneSymbol: gt.geneSymbol,
        transcript: gt.transcript,
        hgncId: gt.hgncId,
        svType: SvType.SV,
        chromosome: chr,
        variantKey: '',
    };

    const dialogRef = this.dialog.open(ManualStructuralVariantDialog, {
      width: '600px',
      data: data
    });

    return firstValueFrom(dialogRef.afterClosed());
  }
}
