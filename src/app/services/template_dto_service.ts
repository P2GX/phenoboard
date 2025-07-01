import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { TemplateDto } from '../models/template_dto';

@Injectable({ providedIn: 'root' })
export class TemplateDtoService {
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
}
