import { ApplicationRef, ComponentRef, Injectable, EnvironmentInjector, inject, createComponent } from '@angular/core';
import { HgvsVariant } from '../../../libs/ui/src/lib/models/variant_dto';
import { ManualHgvsVariantDialog } from '../manualhgvs/manual-hgvs.component';

@Injectable({ providedIn: 'root' })
export class VariantDialogService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  async openVariantDialog(data: Partial<HgvsVariant> = {}): Promise<HgvsVariant | null> {
    return new Promise((resolve) => {
      // 1. Create component dynamically
      const componentRef: ComponentRef<ManualHgvsVariantDialog> = createComponent(ManualHgvsVariantDialog, {
        environmentInjector: this.injector,
      });

      // 2. Pass input data
      componentRef.setInput('data', data);

      // 3. Attach to application view tree so change detection runs
      this.appRef.attachView(componentRef.hostView);

      // 4. Append to DOM (e.g., document.body)
      const domElem = (componentRef.hostView as any).rootNodes[0] as HTMLElement;
      document.body.appendChild(domElem);

      // 5. Listen to the closed output stream
      const sub = componentRef.instance.closed.subscribe((result: HgvsVariant | null) => {
        sub.unsubscribe();
        // Clean up DOM and application view
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        domElem.remove();

        resolve(result);
      });
    });
  }
}