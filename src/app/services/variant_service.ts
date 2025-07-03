import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { VariantDto, VariantListDto } from '../models/variant_dto';

@Injectable({ providedIn: 'root' })
export class VariantDtoService {
    private variantListSubject = new BehaviorSubject<VariantListDto | null>(null);
    varlist$ = this.variantListSubject.asObservable();

    setVariantList(template: VariantListDto) {
        this.variantListSubject.next(template);
    }

    getVariantList(): VariantListDto | null {
        return this.variantListSubject.value;
    }

    clearVariantList() {
        this.variantListSubject.next(null);
    }

    addVariant(variant: VariantDto): void {
    const current = this.variantListSubject.value;

    if (current?.variantDtoList.some(v => v.variant_string === variant.variant_string)) {
        console.warn(`Variant already exists: ${variant.variant_string}`);
        return;
    }

    const updated: VariantListDto = current
        ? { variantDtoList: [...current.variantDtoList, variant] }
        : { variantDtoList: [variant] };
    this.variantListSubject.next(updated);
    }

    removeVariant(variant_string: string): void {
        const current = this.variantListSubject.value;
        if (!current) return;

        const updatedVariants = current.variantDtoList.filter(
            v => v.variant_string !== variant_string
        );

        this.variantListSubject.next({ variantDtoList: updatedVariants });
    }

    updateVariant(updated: VariantDto): void {
        const current = this.variantListSubject.value;
        if (!current) return;

        const updatedVariants = current.variantDtoList.map(v =>
            v.variant_string === updated.variant_string ? updated : v
        );

        this.variantListSubject.next({ variantDtoList: updatedVariants });
        }

}
