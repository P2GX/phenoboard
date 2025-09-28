import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CohortData, GeneTranscriptData, DiseaseData, RowData } from '../models/cohort_dto';
import { ConfigService } from './config.service';
import { HgvsVariant, StructuralVariant, VariantDto } from '../models/variant_dto';



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
    private cohortDtoSubject = new BehaviorSubject<CohortData | null>(null);
    cohortData$ = this.cohortDtoSubject.asObservable();

    
    setCohortData(template: CohortData) {
        this.cohortDtoSubject.next(template);
    }

    getCohortData(): CohortData | null {
        const current = this.cohortDtoSubject.getValue();
        return current;
    }

    clearCohortData() {
        this.cohortDtoSubject.next(null);
    }

    getDiseaseList(): DiseaseData[] {
        const templateDto = this.cohortDtoSubject.getValue();
        if (templateDto == null) {
            return [];
        }
        const dto = templateDto.diseaseList;
        return dto || null;
    }

    getCohortAcronym(): string | null {
        const cohortData = this.cohortDtoSubject.getValue();
        if (cohortData == null) {
            console.error("Attempt to get acronym but cohort template was null");
            return null;
        }
        if (cohortData.cohortAcronym == null) {
            console.error("Cohort acronym not initialized");
            return null;
        }
        return cohortData.cohortAcronym;
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
        const updated: CohortData = {
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
        const updated: CohortData = {
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
        const updated: CohortData = {
            ...current,
            cohortAcronym: acronym
        };
        this.cohortDtoSubject.next(updated);
    }

    async saveCohortDto(): Promise<void> {
        const cohort = this.getCohortData();
        if (cohort != null) {
            return await this.configService.validateCohort(cohort);
        } else {
            console.error("Attempt to save null CohortDto");
        }
    }

    /* Get all of the gene symbol/HGNC/transcript entries for the current
    cohort. For Mendelian, this should be just one */
    getGeneTranscriptDataList(): GeneTranscriptData[] {
        const disease_list = this.getDiseaseList();
        if (disease_list == null || disease_list.length == 0) {
            console.error("Attempt to retrieve genes but disease_list was empty");
            return [];
        }
        const gt_list: GeneTranscriptData[] = disease_list.flatMap(d => d.geneTranscriptList);
        return  gt_list;
    }




    /** Return a list of all variant strings for structural variants */
    getVariantDtos(): VariantDto[] {
       /*
        const template = this.getCohortDto();
        const prefixes = ['DEL', 'DUP', 'INV', 'INS', 'SV', 'TRANSL'];
        if (template == null) {
            return [];
        }
        const seen = new Set<string>();
        const dto_list: VariantDto[] = [];

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

    /** This method is used to see if the current CohortData is initialized and has data rows -- if this is
     * the case, we need to merge data coming from an EtlDto, otherwise we can just set the cohortData to the
     * new cohort
     */
    currentCohortContainsData() {
      const current = this.cohortDtoSubject.getValue();
      if (current == null) {
        return false;
      }
      return (current.rows.length > 0);
    }

    findPhenopacketById(id: string): RowData | undefined {
        const cohort = this.getCohortData();
        if (!cohort) {
            return undefined;
        }
        return cohort.rows.find(
            row => row.individualData.individualId === id
        );
  }

  /**
   * 
   * @returns Try to a get a chromosome to use to initialize a dialog.
   */
    getChromosome(): string {
        const cohort = this.getCohortData();
        if (cohort == null) {
            return '';
        }
        if (cohort.cohortType != 'mendelian') {
            console.error("getChromosome -- Only applicable to Mendelian")
            return ''; // We probably will only use this for mendelian, but let's avoid surprises.
        }
       Object.entries(cohort.hgvsVariants).forEach(([key, hgvs]) => {
            return hgvs.chr;
        });
        Object.entries(cohort.structuralVariants).forEach(([key, sv]) => {
            return sv.chromosome;
        });
        return '';
    }

}
