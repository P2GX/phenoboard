import { afterNextRender, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransformLabels, TransformType } from '@workspace/ui';
import { SubmenuPositionDirective } from './submenu-position.directive';


@Component({
  selector: 'app-column-context-menu',
  standalone: true,
  imports: [CommonModule, SubmenuPositionDirective],
  templateUrl: './column-context-menu.component.html',
  styleUrl: './column-context-menu.component.scss'
})
export class ColumnContextMenuComponent {
  // Positioning coordinates
  x = input.required<number | null>();
  y = input.required<number | null>();
  
  // Column Metadata context
  headerOriginalName = input<string>('');
  columnType = input<string>('');
  
  // Data configuration configurations passed from parent array mappings
  simpleColumnOperations = input.required<string[]>();
  transformCategories = input.required<any[]>();

  // Action event streams
  simpleOpRequested = output<string>();
  transformRequested = output<string>();
  mergeActionRequested = output<'SET_A' | 'SET_B' | 'EXECUTE'>();
  close = output<void>();

    private menuEl = viewChild.required<ElementRef<HTMLElement>>('menuEl');

  // Final, safe-to-render coordinates — start equal to input, corrected after measuring.
  safeX = signal(0);
  safeY = signal(0);

constructor() {
    afterNextRender(() => {
       console.log('menuEl found:', this.menuEl().nativeElement);
      const rect = this.menuEl().nativeElement.getBoundingClientRect();
      const rawX = this.x() ?? 0;
      const rawY = this.y() ?? 0;

      let adjustedX = rawX;
      let adjustedY = rawY;

      if (rawX + rect.width > window.innerWidth) {
        adjustedX = rawX - rect.width;
      }
      if (rawY + rect.height > window.innerHeight) {
        adjustedY = rawY - rect.height;
      }

      this.safeX.set(Math.max(10, adjustedX));
      this.safeY.set(Math.max(10, adjustedY));
    });
  }
  

  getTransformDisplayName(t: string): string {
    const lookupKey = t as TransformType;
    return TransformLabels[lookupKey] || t;
  }
}