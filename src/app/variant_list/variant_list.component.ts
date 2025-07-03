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

  constructor(private configService: ConfigService, private variantService: VariantDtoService) {}

  async ngOnInit() {
    console.log("ngOnInit");
     this.configService.getVariantList().subscribe({
      next: (variantList) => this.variantService.setVariantList(variantList),
      error: (err) => console.error('Failed to load variant list:', err),
    });
  }
  }
variant: string = '';
  isHgvs: boolean = false;

  structuralTypes = ['deletion', 'insertion', 'duplication', 'inversion'];
  selectedStructuralType: string | null = null;

  geneOptions = ['BRCA1', 'TP53', 'CFTR', 'MYH7']; // Replace with dynamic options
  selectedGene: string | null = null;

  onVariantInput(): void {
    this.isHgvs = this.variant.trim().startsWith('c.');
  }

  submitHgvs(): void {
    // For now just use this
    //NM_021957.4(GYS2):c.736C>T (p.Arg246Ter)
    const transcript = 'NM_021957.4';
    const symbol = 'GYS2'
    const hgvs = 'c.736C>T'

    console.log('Submitting HGVS:', this.variant, this.selectedGene);
    // send to Rust via invoke or emit
  }

  submitSv(): void {
    console.log('Submitting SV:', this.variant, this.selectedGene, this.selectedStructuralType);
    // send to Rust via invoke or emit
  }

  onenVariantValidator(event: MouseEvent): void {
    event.preventDefault();
    const vv_url = "https://variantvalidator.org/";
    this.openLink(vv_url);
  }

  async openLink(url: string) {
    await openUrl(url);
  }

}
