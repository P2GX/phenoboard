
import { Component, input } from '@angular/core';

const ICON_PATHS: Record<string, string> = {
  call_merge: 'M17 20.41 18.41 19 15 15.59 13.59 17 17 20.41zM7.5 8H11v5.59L5.59 19 7 20.41l6-6V8h3.5L12 3.5 7.5 8z',
  history: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  // add more as you centralize them
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 24 24'" [attr.width]="size()" [attr.height]="size()" fill="currentColor" aria-hidden="true">
      <path [attr.d]="path()" />
    </svg>
  `
})
export class IconComponent {
  name = input.required<string>();
  size = input<number>(20);

  path = () => ICON_PATHS[this.name()] ?? '';
}