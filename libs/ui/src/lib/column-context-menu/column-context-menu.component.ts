import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-column-context-menu',
  standalone: true,
  imports: [CommonModule],
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

  getTransformDisplayName(t: string): string {
    // If you have a cleaner mapping lookup utility, slot it here, or just space out names:
    return t.replace(/([A-Z])/g, ' $1').trim();
  }
}