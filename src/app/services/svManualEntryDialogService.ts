import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, inject, Injectable } from '@angular/core';
import { StructuralVariant, SvType } from '../../../libs/ui/src/lib/models/variant_dto';
import { ManualStructuralVariantDialog } from '../manualsv/manual-sv.component';
import { GeneTranscriptData } from '../../../libs/ui/src/lib/models/cohort_dto';

@Injectable({ providedIn: 'root' })
export class SvDialogService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  async openSvDialog(
    gt: GeneTranscriptData,
    cell_contents: string,
    chr: string,
  ): Promise<StructuralVariant | null> {
    const data: StructuralVariant = {
      label: cell_contents,
      geneSymbol: gt.geneSymbol,
      transcript: gt.transcript,
      hgncId: gt.hgncId,
      svType: SvType.SV,
      chromosome: chr,
      variantKey: '',
    };

    return new Promise((resolve) => {
      const componentRef: ComponentRef<ManualStructuralVariantDialog> = createComponent(
        ManualStructuralVariantDialog, 
        { environmentInjector: this.injector }
      );
      
      componentRef.setInput('data', data);

      this.appRef.attachView(componentRef.hostView);
      const domElem = (componentRef.hostView as any).rootNodes[0] as HTMLElement;
      document.body.appendChild(domElem);

      const sub = componentRef.instance.closed.subscribe(
        (result: StructuralVariant | null) => {
          sub.unsubscribe();
          this.appRef.detachView(componentRef.hostView);
          componentRef.destroy();
          domElem.remove();
          resolve(result); // Resolves the outer Promise
        }
      );
    });
  }
}