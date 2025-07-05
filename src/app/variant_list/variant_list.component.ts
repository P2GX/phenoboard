import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';
import { ChangeDetectorRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { openUrl } from '@tauri-apps/plugin-opener';
import { VariantDtoService } from '../services/variant_service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddVariantComponent } from '../addvariant/addvariant.component';


@Component({
  selector: 'app-variant_list',
  standalone: true,
  imports:[CommonModule, FormsModule, MatButtonModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatOption, MatSelectModule],
  templateUrl: './variant_list.component.html',
  styleUrls: ['./variant_list.component.css']
})
export class VariantListComponent implements OnInit {

  hpoJsonPath: string | null = null;
  hpocuratorSettingsPath: string | null = null;
  hpoVersion: string | null = null;
  isLoading:boolean = false;

  constructor(private configService: ConfigService, private variantService: VariantDtoService, private dialog: MatDialog) {}

  async ngOnInit() {
    /*this.configService.getVariantList()
      .then(variantList => this.variantService.setVariantList(variantList))
      .catch(err => console.error('Failed to load variant list:', err));*/
      console.log("VariantListComponent - ngOnInit")
  }

    openVariantDialog(): void {
      console.log("VariantListComponent - openVariantDialog")
      const dialogRef = this.dialog.open(AddVariantComponent, {
        width: '600px',
        data: {
          // optionally pass initial values here
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Handle submitted variant (e.g. add to list)
          console.log('Variant submitted:', result);
        }
      });
  }
}

