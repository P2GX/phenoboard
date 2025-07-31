import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { openUrl } from '@tauri-apps/plugin-opener';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { ConfigService } from '../services/config.service';
import { StructuralType, VariantDto } from '../models/variant_dto';
import { TemplateDtoService } from '../services/template_dto_service';
import { GeneTranscriptDto } from '../models/template_dto';



@Component({
  selector: 'app-addvariant',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatOption, MatSelectModule],
  templateUrl: './addvariant.component.html',
  styleUrl: './addvariant.component.css'
})
export class AddVariantComponent {


  constructor(
    private configService: ConfigService, 
    private templateService: TemplateDtoService,
    private dialogRef: MatDialogRef<AddVariantComponent>
  ){}
  
  async ngOnInit(): Promise<void> {
    this.geneOptions = this.templateService.getAllGeneSymbolTranscriptPairs();
  }

  /** This will emit an event that can be captured by the parent component (see method addVariantToDto)  */
  @Output() variantAccepted = new EventEmitter<VariantDto>();

  variant: VariantDto | null = null;
  variant_string: string = '';
  isHgvs: boolean = false;

  errorMessage: string | null = null;
  variantValidated: boolean = false;

  structuralTypes: StructuralType[] = [
    {'label':'deletion', 'id':'DEL'},
    {'label':'insertion', 'id':'INS'},
    {'label':'duplication', 'id':'DUP'},
    {'label':'inversion', 'id':'INV'},
    {'label':'translocation', 'id':'TRANSL'},
    {'label':'sv (general)', 'id':'SV'},];

  geneOptions: GeneTranscriptDto[] = []; 
  selectedGene: GeneTranscriptDto | null = null;
  selectedStructuralType: StructuralType | null = null;

  validationMessage: string = '';
  isSubmitting = false;
  validationComplete = false;


  onVariantInput(): void {
    this.resetVars();
    //const hgvsRegex = /^(c|n)\.\d+(_\d+)?([A-Z]+>[A-Z]+|del|dup|ins)?$/;
    if (!this.variant_string) {
      this.errorMessage = 'Empty variant not allowed';
      this.isHgvs = false;
    } else if (this.variant_string.startsWith('c.') || this.variant_string.startsWith('n.')){
      this.errorMessage = null;
      this.isHgvs = true;
    } else {
      this.errorMessage = null;
      this.isHgvs = false;
    }
  }

  resetVars(): void {
    this.errorMessage = null;
    this.variantValidated = false;
    this.isHgvs = false;
  }

  async submitSvDto(): Promise<void> {
    if (!this.variant || !this.selectedGene) {
      this.errorMessage = 'Please enter a valid variant and select a gene.';
      this.variantValidated = false;
      return;
    }
    this.errorMessage = null;
    this.variant = {
      variant_string: this.variant_string,
      transcript: this.selectedGene.transcript,
      hgnc_id: this.selectedGene.hgncId,
      gene_symbol:this.selectedGene.geneSymbol,
      validated: false,
      is_structural: true
    }
    return await this.submitVariantDto(this.variant);
  }

  async submitHgvsDto(): Promise<void> {
    console.log("submitHgvsDto line 113, variant=", this.variant_string)
    if (!this.variant_string || !this.selectedGene) {
      this.errorMessage = 'Please enter a valid variant and select a gene.';
      this.variantValidated = false;
      return;
    }
    this.errorMessage = null;
    const dto: VariantDto = {
      variant_string: this.variant_string,
      transcript: this.selectedGene.transcript,
      hgnc_id: this.selectedGene.hgncId,
      gene_symbol:this.selectedGene.geneSymbol,
      validated: false,
      is_structural: false
    }
    return await this.submitVariantDto(dto);
  }



  async submitVariantDto(dto: VariantDto): Promise<void> {
    this.isSubmitting = true;
    this.configService.submitVariantDto(dto)
      .then((updated_dto) => {
        if (updated_dto.validated) {
          this.variantValidated = true;
          this.validationComplete = true;
          this.isSubmitting = false;
          this.variant = updated_dto;
        } else {
          this.variantValidated = false;
          this.validationComplete = true; // failure, but completed, we will show error
          this.errorMessage = 'Variant is not valid';
          this.isSubmitting = false;
          console.log("submitHgvsDto-error")
        }
      })
      .catch((err) => {
        this.variantValidated = false;
        this.validationComplete = true; // failure, but completed, we will show error
        this.variantValidated = false;
        this.isSubmitting = false;
        this.errorMessage = `Variant submission failed: ${err}`;
      })
    }
  

  openHgvs($event: MouseEvent) {
    const url = "https://hgvs-nomenclature.org/"
    openUrl(url)
  }
  openVariantValidator($event: MouseEvent) {
    const url = "https://variantvalidator.org/";
    openUrl(url);
  }

  /**
   * Open a URL in the (external) system browser
  */
  async openLink(url: string) {
    await openUrl(url);
  }

  /**
   * Close the dialog without changing state
  */
  cancel() {
    this.dialogRef.close();
  }

  /**
   * Emits the validated variant to the parent component so it can be added
   * to the current phenopacket row object.
   *
   * The parent component must handle this event using a binding like:
   *
   * ```html
   * <app-add-variant-dialog
   *   (variantAccepted)="handleVariantAccepted($event)">
   * </app-add-variant-dialog>
   * ```
   */
  addVariantToPpkt() {
    if (this.variantValidated && this.variant) {
      this.dialogRef.close(this.variant);
    } else {
      this.errorMessage = "attempt to add invalid variant";
    }
  }

}
