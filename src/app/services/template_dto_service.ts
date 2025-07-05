import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { TemplateDto } from '../models/template_dto';
import { GeneTranscriptDto } from '../models/gene_dto';
import { ConfigService } from './config.service';

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
}
