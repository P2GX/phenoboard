import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { openUrl } from '@tauri-apps/plugin-opener';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'; // Keep if you use Angular Material Dialog container overlay, otherwise replace with custom dialog reference if fully migrated
import { ConfigService } from '../services/config.service';
import { HgvsVariant, StructuralType, StructuralVariant, VariantDto, displaySv, displayHgvs, displayIntergenic, IntergenicHgvsVariant } from '../../../libs/ui/src/lib/models/variant_dto';
import { CohortDtoService } from '../services/cohort_dto_service';
import { GeneTranscriptData } from '../../../libs/ui/src/lib/models/cohort_dto';

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
  alleleCount: number;
}

type ValidatorFn = () => Promise<void>;

@Component({
  selector: 'app-addvariant',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './addvariant.component.html',
  styleUrl: './addvariant.component.scss',
  encapsulation: ViewEncapsulation.None,  
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddVariantComponent implements OnInit {
  private configService = inject(ConfigService); 
  private cohortService = inject(CohortDtoService);
  private dialogRef = inject(MatDialogRef<AddVariantComponent, VariantDto | null>);
  readonly data = inject<AddVariantDialogData>(MAT_DIALOG_DATA);
  readonly kind: VariantKind = this.data.kind;
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    this.geneOptions = this.cohortService.getGeneTranscriptDataList();
    if (this.geneOptions && this.geneOptions.length === 1) {
        this.selectedGene = this.geneOptions[0];
    }
  }

  private validators: Record<VariantKind, ValidatorFn> = {
    [VariantKind.HGVS]: () => this.submitHgvsDto(),
    [VariantKind.SV]: () => this.submitSvDto(),
    [VariantKind.INTERGENIC]: () => this.submitIntergenicDto(),
  };

  currentHgvsVariant: HgvsVariant | null = null;
  currentStructuralVariant: StructuralVariant | null = null;
  currentIntergenicVariant: IntergenicHgvsVariant | null = null;

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
    {'label':'sv (general)', 'id':'SV'}
  ];

  geneOptions: GeneTranscriptData[] = []; 
  selectedGene: GeneTranscriptData | null = null;
  selectedStructuralType: StructuralType | null = null;

  validationMessage = '';
  isSubmitting = false;
  validationComplete = false;

  onVariantInput(): void {
    this.resetVars();
    if (this.isHgvs()) {
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

  async submitSvDto(): Promise<void> {
    if (!this.variant_string || !this.selectedGene || !this.selectedStructuralType) {
      this.errorMessage = 'Please enter a valid variant and select a gene and a SV type';
      this.variantValidated = false;
      return;
    }
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
        this.cdr.markForCheck();
      })
      .catch((error) => {
        alert(String(error));
      });
  }

  private fail(message: string): void {
    this.errorMessage = message;
    this.variantValidated = false;
  }

  async submit(): Promise<void> {
    if (!this.kind) return;
    await this.validators[this.kind]();
  }

  async submitIntergenicDto(): Promise<void> {
    if (!this.variant_string || !this.selectedGene) {
      return this.fail('Please enter a valid variant and select a gene.');
    }
    const cohortData = this.cohortService.getCohortData();
    if (!cohortData) {
      return this.fail("Attempt to validate intergenic HGVS with null cohortData");
    }
    this.errorMessage = null;
    this.configService.validateIntergenic(this.selectedGene.geneSymbol, this.selectedGene.hgncId, this.variant_string).then((ig) => {
        this.currentIntergenicVariant = ig;
        this.variantValidated = true;
        cohortData.intergenicVariants[ig.variantKey] = ig;
        this.cdr.markForCheck();
      })
      .catch((error) => {
        alert(String(error));
      });
  }

  async submitHgvsDto(): Promise<void> {
     if (!this.variant_string || !this.selectedGene) {
      return this.fail('Please enter a valid variant and select a gene.');
    }
    this.errorMessage = null;
    const cohortDto = this.cohortService.getCohortData();
    if (!cohortDto) {
      return this.fail("Attempt to validate HGVS with null cohortDto");
    }
    this.configService.validateHgvsVariant(this.selectedGene.geneSymbol, this.selectedGene.hgncId, this.selectedGene.transcript, this.variant_string)
      .then((hgvs) => {
        this.currentHgvsVariant = hgvs;
        this.variantValidated = true;
        cohortDto.hgvsVariants[hgvs.variantKey] = hgvs;
        this.cdr.markForCheck();
      })
      .catch((error) => {
        alert(String(error));
      });
  }

  openHgvs($event: MouseEvent): void {
    $event.preventDefault();
    openUrl("https://hgvs-nomenclature.org/");
  }

  openVariantValidator($event: MouseEvent): void {
    $event.preventDefault();
    openUrl("https://variantvalidator.org/");
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getSubmitLabel(): string {
    if (this.isHgvs()) return 'Submit HGVS';
    if (this.isStructural()) return 'Submit SV';
    if (this.isIntergenic()) return 'Submit Intergenic';
    return 'Cannot determine variant type';
  }

  addVariantToPpkt(): void {
    if (!this.variantValidated) {
      alert("Could not add variant");
      return;
    }
    if (this.currentHgvsVariant != null) {
       this.cohortService.addHgvsVariant(this.currentHgvsVariant);
       const hgvsVarDto: VariantDto = displayHgvs(this.currentHgvsVariant, true);
       hgvsVarDto.count = this.isBiallelic ? 2 : 1;
       this.dialogRef.close(hgvsVarDto);
    } else if (this.currentStructuralVariant != null) {
      this.cohortService.addStructuralVariant(this.currentStructuralVariant);
      const svVarDto: VariantDto = displaySv(this.currentStructuralVariant, true);
      svVarDto.count = this.isBiallelic ? 2 : 1;
      this.dialogRef.close(svVarDto);
    } else if (this.currentIntergenicVariant != null) {
      this.cohortService.addIntergenicVariant(this.currentIntergenicVariant);
      const IgVarDto: VariantDto = displayIntergenic(this.currentIntergenicVariant, true);
      IgVarDto.count = this.isBiallelic ? 2 : 1;
      this.dialogRef.close(IgVarDto);
    } else {
      alert("Unable to add variant");
      this.errorMessage = "attempt to add invalid variant";
    }
  }
}