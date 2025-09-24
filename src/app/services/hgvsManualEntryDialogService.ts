// variant-dialog.service.ts
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HgvsVariant } from '../models/variant_dto';
import { firstValueFrom } from 'rxjs';
import { ManualHgvsVariantDialog } from '../manualhgvs/manual-hgvs.component';

@Injectable({ providedIn: 'root' })
export class VariantDialogService {
  constructor(private dialog: MatDialog) {}

  async openVariantDialog(data: Partial<HgvsVariant> = {}): Promise<HgvsVariant | null> {
    const dialogRef = this.dialog.open(ManualHgvsVariantDialog, {
      width: '600px',
      data
    });

    return firstValueFrom(dialogRef.afterClosed());
  }
}
