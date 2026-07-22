import { Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
  selector: '[appSubmenuPosition]',
  standalone: true,
})
export class SubmenuPositionDirective {
  private el = inject(ElementRef<HTMLElement>);

  @HostListener('mouseenter')
  onMouseEnter(): void {
    // Reset first, so repeated hovers don't compound previous flips
    const el = this.el.nativeElement;
    el.classList.remove('flip-left', 'flip-up');

    // Force a synchronous layout read now that it's about to be visible via CSS
    const rect = el.getBoundingClientRect();

    if (rect.right > window.innerWidth) {
      el.classList.add('flip-left');
    }
    if (rect.bottom > window.innerHeight) {
      el.classList.add('flip-up');
    }
  }
}