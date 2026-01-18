import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { openUrl } from '@tauri-apps/plugin-opener';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfigService } from '../services/config.service';
import { HgvsVariant, StructuralType, StructuralVariant, VariantDto, displaySv, displayHgvs, displayIntergenic,IntergenicHgvsVariant } from '../models/variant_dto';
import { CohortDtoService } from '../services/cohort_dto_service';
import { GeneTranscriptData } from '../models/cohort_dto';
import { MatCheckboxModule } from '@angular/material/checkbox';

/* This widget can validate small HGVS variants (e.g., small number of nucleotides, "c."("n.")),
structural variants (symbolic, e.g., DEL ex3), and intergenic variants (not located in transcripts,
represented using chromosomal accession numbers). */
export enum VariantKind {
  HGVS = 'HGVS',
  SV = 'SV',
  INTERGENIC = 'INTERGENIC'
}


export interface AddVariantDialogData {
  rowId: string;
  kind: VariantKind;
}


export interface VariantAcceptedEvent {
  variant: string;
  alleleCount: number; // mono or biallelic
}

type ValidatorFn = () => Promise<void>;

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
      MatCardModule,MatCheckboxModule, MatInputModule, MatFormFieldModule, 
      MatOption, MatSelectModule],
  templateUrl: './addvariant.component.html',
  styleUrl: './addvariant.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddVariantComponent implements OnInit{
  kind!: VariantKind; 

  private configService = inject(ConfigService); 
  private cohortService= inject(CohortDtoService);
  private dialogRef= inject(MatDialogRef<AddVariantComponent, VariantDto | null>);
  readonly data = inject<AddVariantDialogData>(MAT_DIALOG_DATA);
  constructor() {
    this.kind = this.data.kind;
    const row = this.cohortService.getRowById(this.data.rowId);
  }
  
  

  async ngOnInit(): Promise<void> {
    this.geneOptions = this.cohortService.getGeneTranscriptDataList();
    if (this.geneOptions && this.geneOptions.length === 1) {
        // Set the selectedGene model property to the only entry in the list
        this.selectedGene = this.geneOptions[0];
    }
    
  }

  

  private validators: Record<VariantKind, ValidatorFn> = {
    [VariantKind.HGVS]: () => this.submitHgvsDto(),
    [VariantKind.SV]: () => this.submitSvDto(),
    [VariantKind.INTERGENIC]: () => this.submitIntergenicDto(),
  };

  
  /* If the current variant was HGVS and was validated, this variant is non-null */
  currentHgvsVariant: HgvsVariant | null = null;
  /* If the current variant was structural and was validated, this variant is non-null */
  currentStructuralVariant: StructuralVariant | null = null;
  /* If the current variant was intergenic and was validated, this variant is non-null */
  currentIntergenicVariant: IntergenicHgvsVariant |null = null;

  isHgvs(): boolean {
    return this.kind === VariantKind.HGVS;
  }

  isStructural(): boolean {
    return this.kind === VariantKind.SV;
  }

  isIntergenic(): boolean {
    return this.kind == VariantKind.INTERGENIC;
  }


  variant_string = '';
  isBiallelic = false;

  errorMessage: string | null = null;
  variantValidated = false;

  structuralTypes: StructuralType[] = [
    {'label':'deletion', 'id':'DEL'},
    {'label':'insertion', 'id':'INS'},
    {'label':'duplication', 'id':'DUP'},
    {'label':'inversion', 'id':'INV'},
    {'label':'translocation', 'id':'TRANSL'},
    {'label':'sv (general)', 'id':'SV'},];

  geneOptions: GeneTranscriptData[] = []; 
  selectedGene: GeneTranscriptData | null = null;
  selectedStructuralType: StructuralType | null = null;

  validationMessage = '';
  isSubmitting = false;
  validationComplete = false;

  /** This is called from -   (input)="onVariantInput()" -- everytime the value of the input field changes.
   * The main purpose is to determine if we have an HGVS variant or not. If we do, then the SV drop down is hidden,
   * if not, we show the Sv dropdown menu with the SV types.
   */
  onVariantInput(): void {
    this.resetVars();
    if (this.isHgvs()) {
      // we strip whitespace from HGVS variants because it is common for publications to add space e.c., c.123 A > T
      this.variant_string = this.variant_string.replace(/\s+/g, '');
    }
    if (!this.variant_string) {
      this.errorMessage = 'Empty variant not allowed';
    } else if (this.variant_string.startsWith('c.') || this.variant_string.startsWith('n.')){
      this.errorMessage = null;
    } else if (this.variant_string.startsWith("NC_")) {
      this.errorMessage = null;
    } else if (this.variant_string.startsWith("g.")) {
      this.errorMessage = "Intergenic variants should be formatted as chromosome accession (e.g., NC_000019.10), semicolon, genomic HGVS";
    } else {
      this.errorMessage = null;
    }
  }

  resetVars(): void {
    this.errorMessage = null;
    this.variantValidated = false;
  }

  /** This function is called if the user has entered data about a structural variant and
   * clicks on the "Submit SV" button. We send the current cohortDto to the backend so that
   * the backend calculates the variantKey and sees if we have already validated this variant,
   * in which case, we return a copy of it. Otherwise, the backend creates a new variant.
   * In either case, when the user activates addVariantToPpkt the new variant will be stored
   * in the HashMap. This function itself only initializes the variant currentStructuralVariant,
   * so that the user can cancel the variant for whatever reason.
   */
  async submitSvDto(): Promise<void> {
    if (!this.variant_string || !this.selectedGene || !this.selectedStructuralType) {
      this.errorMessage = 'Please enter a valid variant and select a gene and a SV type';
      this.variantValidated = false;
      return;
    }
    console.log("submitSvDto, ", this.variant_string);
    this.errorMessage = null;
    const vv_dto: VariantDto = {
      variantString: this.variant_string,
      transcript: this.selectedGene.transcript,
      hgncId: this.selectedGene.hgncId,
      geneSymbol: this.selectedGene.geneSymbol,
      variantType: "SV",
      isValidated: false,
      count: 0
    };
    const cohortDto = this.cohortService.getCohortData();
    if (cohortDto == null) {
      console.error("Attempt to validate SV with null cohortDto");
      return;
    }
    this.configService.validateSv(vv_dto)
      .then((sv) => {
        this.currentStructuralVariant = sv;
        this.variantValidated = true;
      })
      .catch((error) => {
        alert(String(error));
      });
  }


  
  private fail(message: string): void {
    this.errorMessage = message;
    this.variantValidated = false;
    return;
  }

  async submit(): Promise<void> {
    if (! this.kind) return;
    await this.validators[this.kind]();
  }

  async submitIntergenicDto(): Promise<void> {
    if (!this.variant_string || !this.selectedGene) {
      return this.fail('Please enter a valid variant and select a gene.');
    }
    console.log("submitIntergenicDto=", this.variant_string);
    const cohortData = this.cohortService.getCohortData();
    if (! cohortData) {
      return this.fail("Attempt to validate intergenic HGVS with null cohortData");
    }
    this.errorMessage = null;
    this.configService.validateIntergenic(this.selectedGene.geneSymbol, this.selectedGene.hgncId, this.variant_string).then((ig) => {
        this.currentIntergenicVariant = ig;
        this.variantValidated = true;
        cohortData.intergenicVariants[ig.variantKey] = ig;
        console.log("Intergenic variant key", ig.variantKey);
        console.log("ig=", ig);
      })
      .catch((error) => {
        alert(String(error));
      });
  }
  

  /** This is called when the user has finished entering an HGVS variant 
   * and clicks on the "Submit HGVS" button. If we are successful, the methods
   * sets the currentHgvsVariant variable and adds it to the HGVS map
   */
  async submitHgvsDto(): Promise<void> {
     if (!this.variant_string || !this.selectedGene) {
      return this.fail('Please enter a valid variant and select a gene.');
    }
    this.errorMessage = null;
    const cohortDto = this.cohortService.getCohortData();
    if (! cohortDto) {
      return this.fail("Attempt to validate HGVS with null cohortDto");
    }
    this.configService.validateHgvsVariant(this.selectedGene.geneSymbol, this.selectedGene.hgncId, this.selectedGene.transcript, this.variant_string)
      .then((hgvs) => {
        this.currentHgvsVariant = hgvs;
        this.variantValidated = true;
        cohortDto.hgvsVariants[hgvs.variantKey] = hgvs;
      })
      .catch((error) => {
        alert(String(error));
      });
  }

  openHgvs($event: MouseEvent): void {
    $event.preventDefault();
    const url = "https://hgvs-nomenclature.org/"
    openUrl(url)
  }
  openVariantValidator($event: MouseEvent): void {
    $event.preventDefault();
    const url = "https://variantvalidator.org/";
    openUrl(url);
  }

  /**
   * Open a URL in the (external) system browser
  */
  async openLink(url: string): Promise<void> {
    await openUrl(url);
  }

  /**
   * Close the dialog without changing state
  */
  cancel(): void {
    this.dialogRef.close();
  }

  getSubmitLabel(): string {
    if (this.isHgvs()) return 'Submit HGVS';
    if (this.isStructural()) return 'Submit SV';
    if (this.isIntergenic()) return 'Submit Intergenic';
    return 'Cannot determine variant type';
  }

  /**
   * Emits the validated variant to the parent component so it can be added
   * to the current phenopacket row object.
   */
  addVariantToPpkt(): void{
    if (! this.variantValidated) {
      alert("Could not add variant");
      return;
    }
    if (this.currentHgvsVariant != null) {
       this.cohortService.addHgvsVariant(this.currentHgvsVariant);
       const hgvsVarDto: VariantDto = displayHgvs(this.currentHgvsVariant, true);
       hgvsVarDto.count = this.isBiallelic ? 2: 1;
       this.dialogRef.close(hgvsVarDto);
    } else if (this.currentStructuralVariant != null) {
      this.cohortService.addStructuralVariant(this.currentStructuralVariant);
      const svVarDto: VariantDto = displaySv(this.currentStructuralVariant, true);
      svVarDto.count = this.isBiallelic ? 2: 1;
      this.dialogRef.close(svVarDto);
    } else if (this.currentIntergenicVariant != null) {
      this.cohortService.addIntergenicVariant(this.currentIntergenicVariant);
      const IgVarDto: VariantDto = displayIntergenic(this.currentIntergenicVariant, true);
      IgVarDto.count = this.isBiallelic ? 2: 1;
      this.dialogRef.close(IgVarDto);
    } else {
      alert("Unable to add variant")
      this.errorMessage = "attempt to add invalid variant";
    }
  }

}


