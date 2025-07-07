import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { TemplateDto } from '../models/template_dto';
import { GeneTranscriptDto } from '../models/gene_dto';
import { ConfigService } from './config.service';
import { VariantDto } from '../models/variant_dto';

@Injectable({ providedIn: 'root' })
export class TemplateDtoService {
    constructor(private configService: ConfigService){}
    private templateSubject = new BehaviorSubject<TemplateDto | null>(null);
    template$ = this.templateSubject.asObservable();

    setTemplate(template: TemplateDto) {
        this.templateSubject.next(template);
    }

    getTemplate(): TemplateDto | null {
        return this.templateSubject.value;
    }

    clearTemplate() {
        this.templateSubject.next(null);
    }

    async saveTemplate(): Promise<void> {
        const template = this.getTemplate();
        if (template != null) {
            return await this.configService.validateCohort(template);
        } else {
            console.error("Attempt to save null template");
        }
    }

    /* Get all of the gene symbol/HGNC/transcript entries for the current
    cohort. For Mendelian, this should be just one */
    getAllGeneSymbolTranscriptPairs(): GeneTranscriptDto[] {
        const seen = new Set<string>();
        console.log("getAllGeneSymbolTranscriptPairs TOP");
        const template = this.getTemplate();
        if (template == null) {
            console.error("Attempt to retrieve genes but template was null");
            return [];
        }
        return template.rows
            .flatMap(row => row.geneVarDtoList)
            .map(dto => ({
                hgncId: dto.hgncId,
                geneSymbol: dto.geneSymbol,
                transcript: dto.transcript
            }))
            .filter(dto => {
                const key = `${dto.hgncId}|${dto.geneSymbol}|${dto.transcript}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }


    /** Return a list of all variant strings represented in the cohort */
    getVariantDtos(): VariantDto[] {
        const template = this.getTemplate();
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
    }
}
