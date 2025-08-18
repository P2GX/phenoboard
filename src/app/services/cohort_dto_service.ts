import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DiseaseGeneDto, CohortDto, GeneTranscriptDto } from '../models/cohort_dto';
import { ConfigService } from './config.service';
import { HgvsVariant, StructuralVariant, VariantValidationDto } from '../models/variant_dto';


/**
 * This service is the one source of truth for the Cohort data (Template). The data is sent to the back end to add
 * new rows, to serialize, etc., but the updated tempalte is sent back and capture here. 
 * We consider this service to have the one source of truth
 */
@Injectable({ providedIn: 'root' })
export class CohortDtoService {
    constructor(private configService: ConfigService){
        console.log('🟡 CohortDtoService instance created');
    }
    private cohortDtoSubject = new BehaviorSubject<CohortDto | null>(null);
    cohortDto$ = this.cohortDtoSubject.asObservable();

    
    setCohortDto(template: CohortDto) {
        this.cohortDtoSubject.next(template);
    }

    getCohortDto(): CohortDto | null {
        const current = this.cohortDtoSubject.getValue();
        return current;
    }

    clearCohortDto() {
        this.cohortDtoSubject.next(null);
    }

    getDiseaseGeneDto(): DiseaseGeneDto | null {
        const templateDto = this.cohortDtoSubject.getValue();
        const dto = templateDto?.diseaseGeneDto;
        return dto || null;
    }

    getCohortAcronym(): string | null {
        const templateDto = this.cohortDtoSubject.getValue();
        if (templateDto == null) {
            console.error("Attempt to get acronym but cohort template was null");
            return null;
        }
        const dto = templateDto.diseaseGeneDto;
        return dto.cohortAcronym;
    }

    /** Add an HGVS object that has been validated in the backend */
    addHgvsVariant(hgvs: HgvsVariant) {
        const current = this.cohortDtoSubject.value;
        if (!current) {
            alert("No CohortDto available to update");
            return;
        }
        const key = hgvs.variantKey;
        // Create a new object so we don't mutate the existing one directly
        const updated: CohortDto = {
            ...current,
            hgvsVariants: {
                ...current.hgvsVariants,
                [key]: hgvs
            }
        };
        this.cohortDtoSubject.next(updated);
    }

    /** Add an SV object that has been validated in the backend */
    addStructuralVariant(sv: StructuralVariant) {
        const current = this.cohortDtoSubject.value;
        if (!current) {
            alert("No CohortDto available to update");
            return;
        }
        const key = sv.variantKey;
        const updated: CohortDto = {
            ...current,
            structuralVariants: {
                ...current.structuralVariants,
                [key]: sv
            }
        };
        this.cohortDtoSubject.next(updated);
    }

    /** Update the disease cohort acronym, e.g., MFS for Marfan syndrome.
     * This can be useful to set the acronym when we are importing from 
     * a legacy excel file (which does not have a field for disease aronym).
     */
    async setCohortAcronym(acronym: string) {
        const current = this.cohortDtoSubject.value;
        if (!current) {
            alert("No CohortDto available to update");
            return;
        }
        const updated: CohortDto = {
            ...current,
            diseaseGeneDto: {
            ...current.diseaseGeneDto,
            cohortAcronym: acronym
            }
        };
        this.cohortDtoSubject.next(updated);
    }

    async saveCohortDto(): Promise<void> {
        const cohort = this.getCohortDto();
        if (cohort != null) {
            return await this.configService.validateCohort(cohort);
        } else {
            console.error("Attempt to save null CohortDto");
        }
    }

    /* Get all of the gene symbol/HGNC/transcript entries for the current
    cohort. For Mendelian, this should be just one */
    getAllGeneSymbolTranscriptPairs(): GeneTranscriptDto[] {
        const dis_gene_dto = this.getDiseaseGeneDto();
        if (dis_gene_dto == null) {
            console.error("Attempt to retrieve genes but template was null");
            return [];
        }
        return  dis_gene_dto.geneTranscriptDtoList
            .map(dto => ({
                hgncId: dto.hgncId,
                geneSymbol: dto.geneSymbol,
                transcript: dto.transcript
            }));
    }


    /** Return a list of all variant strings for structural variants */
    getVariantDtos(): VariantValidationDto[] {
       /*
        const template = this.getCohortDto();
        const prefixes = ['DEL', 'DUP', 'INV', 'INS', 'SV', 'TRANSL'];
        if (template == null) {
            return [];
        }
        const seen = new Set<string>();
        const dto_list: VariantValidationDto[] = [];

        for (const row of template.rows) {
            for (const geneVar of row.geneVarDtoList) {
                if (geneVar.allele1 == "na" || seen.has(geneVar.allele1)) {
                    continue;
                }
                seen.add(geneVar.allele1);
                const is_sv = prefixes.some(prefix => geneVar.allele1.startsWith(prefix));
                const dto = {
                    variant_string: geneVar.allele1,
                    transcript: geneVar.transcript,
                    hgnc_id: geneVar.hgncId,
                    gene_symbol: geneVar.geneSymbol,
                    validated: is_sv ? true : false,
                    is_structural: is_sv,
                };
                dto_list.push(dto);
                if (geneVar.allele2 == "na" || seen.has(geneVar.allele2)) {
                    continue;
                }
                seen.add(geneVar.allele2);
                const is_sv2 = prefixes.some(prefix => geneVar.allele2.startsWith(prefix));
                const dto2 = {
                    variant_string: geneVar.allele2,
                    transcript: geneVar.transcript,
                    hgnc_id: geneVar.hgncId,
                    gene_symbol: geneVar.geneSymbol,
                    validated: is_sv2 ? true : false,
                    is_structural: is_sv,
                }
                dto_list.push(dto2);
            }
        }
        return dto_list;
        */
       return [];
    }

    /** TODO */
toDiseaseGeneDtoList(template: CohortDto): DiseaseGeneDto[] {
    if (template.rows.length == 0) {
      return [];
    }
    
    if (template.cohortType === "mendelian") {
      const row0 = template.rows[0];
      if (row0.diseaseDtoList.length != 1) {
        // should never happen
        console.error("Malformed Mendelian template, expected only one disease");
      }
      const disease0 = row0.diseaseDtoList[0];
      const diseaseId = disease0.diseaseId; 
      const diseaseLabel = disease0.diseaseLabel;
      if (row0.geneVarDtoList.length != 1) {
         // should never happen
        console.error("Malformed Mendelian template, expected only one gene");
      }
      const gene0 = row0.geneVarDtoList[0];
      const hgnc = gene0.hgncId;
      const symbol = gene0.geneSymbol;
      const trascript = gene0.transcript;
      
      console.log("x");
    }

    return [];
  }
}
