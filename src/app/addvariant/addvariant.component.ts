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
import { HgvsVariant, StructuralType, StructuralVariant, VariantDisplayDto, displaySv, displayHgvs, VariantValidationDto } from '../models/variant_dto';
import { CohortDtoService } from '../services/cohort_dto_service';
import { GeneTranscriptDto } from '../models/cohort_dto';


/**
 * A modal component that pops up when the user clicks on Add Allele
 * It can enter HGVS or SV
 * The component validates each variant using VariantValidator and
 * creates either an HgvsVariant or a StructuralVariant object. It also 
 * creates a key (string) that is used to represent the variant in the
 * HGVS or SV maps of our CohortDto. 
 */
@Component({
  selector: 'app-addvariant',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, 
      MatCardModule, MatInputModule, MatFormFieldModule, 
      MatOption, MatSelectModule],
  templateUrl: './addvariant.component.html',
  styleUrl: './addvariant.component.css'
})
export class AddVariantComponent {
  constructor(
    private configService: ConfigService, 
    private templateService: CohortDtoService,
    private dialogRef: MatDialogRef<AddVariantComponent, VariantDisplayDto | null>
  ){}
  
  async ngOnInit(): Promise<void> {
    this.geneOptions = this.templateService.getAllGeneSymbolTranscriptPairs();
  }

  /** This will emit an event that can be captured by the parent component (see method addVariantToDto)  */
  @Output() variantAccepted = new EventEmitter<string>();
  
  /* If the current variant was HGVS and was validated, this variant is non-null */
  currentHgvsVariant: HgvsVariant | null = null;
  /* If the current variant was structural and was validated, this variant is non-null */
  currentStructuralVariant: StructuralVariant | null = null;

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

  /** This is called from -   (input)="onVariantInput()" -- everytime the value of the input field changes.
   * The main purpose is to determine if we have an HGVS variant or not. If we do, then the SV drop down is hidden,
   * if not, we show the Sv dropdown menu with the SV types.
   */
  onVariantInput(): void {
    this.resetVars();
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

  /** This function is called if the user has entered data about a structural variant and
   * clicks on the "Submit SV" button. If successful, the variant currentStructuralVariant is initialized.
   */
  async submitSvDto(): Promise<void> {
    if (!this.variant_string || !this.selectedGene || !this.selectedStructuralType) {
      this.errorMessage = 'Please enter a valid variant and select a gene and a SV type';
      this.variantValidated = false;
      return;
    }
    this.errorMessage = null;
    const vv_dto: VariantValidationDto = {
      variantString: this.variant_string,
      transcript: this.selectedGene.transcript,
      hgncId: this.selectedGene.hgncId,
      geneSymbol:this.selectedGene.geneSymbol,
      validationType: "SV"
    };
    this.configService.validateSv(vv_dto)
        .then((sv) => {
          console.log("Adding sv", sv);
          this.currentStructuralVariant = sv;
          this.variantValidated = true;
        })
        .catch((error) => {
          alert(String(error));
        });
    }
  

  /** This is called when the user has finished entering an HGVS variant 
   * and clicks on the "Submit HGVS" button. If we are successful, the methods
   * sets the currentHgvsVariant variable. The user then needs to click on the
   *  */
  async submitHgvsDto(): Promise<void> {
    console.log("submitHgvsDto line 113, variant=", this.variant_string)
    if (!this.variant_string || !this.selectedGene) {
      this.errorMessage = 'Please enter a valid variant and select a gene.';
      this.variantValidated = false;
      return;
    }
    this.errorMessage = null;
    const vv_dto: VariantValidationDto = {
      variantString: this.variant_string,
      transcript: this.selectedGene.transcript,
      hgncId: this.selectedGene.hgncId,
      geneSymbol:this.selectedGene.geneSymbol,
      validationType: "HGVS"
    };
    this.configService.validateHgvs(vv_dto)
        .then((hgvs) => {
          console.log("adding hgvs", hgvs);
          this.currentHgvsVariant = hgvs;
           this.variantValidated = true;
        })
        .catch((error) => {
          alert(String(error));
        });
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
    console.log("addVariantToPpkt - top");
    if (this.variantValidated && this.currentHgvsVariant != null) {
       this.templateService.addHgvsVariant(this.currentHgvsVariant);
       const varDisplay = displayHgvs(this.currentHgvsVariant, true);
       this.dialogRef.close(varDisplay);
    } else if (this.variantValidated && this.currentStructuralVariant != null) {
      this.templateService.addStructuralVariant(this.currentStructuralVariant);
      const varDisplay = displaySv(this.currentStructuralVariant, true);
      this.dialogRef.close(varDisplay);
    } else {
      alert("Unable to add variant")
      this.errorMessage = "attempt to add invalid variant";
    }
  }

}


