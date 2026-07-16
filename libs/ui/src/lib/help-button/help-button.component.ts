import {
  Component,
  ElementRef,
  HostListener,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { openUrl } from '@tauri-apps/plugin-opener';

@Component({
  selector: 'app-help-button',
  standalone: true,
  encapsulation: ViewEncapsulation.None, // keep, so .help-bubble styling can escape the host like the old overlay panelClass did
  templateUrl: './help-button.component.html',
  styleUrl: './help-button.component.scss',
})
export class HelpButtonComponent {
  title = input.required<string>();
  lines = input.required<string[]>();
  helpUrl = input<string>();

  isOpen = signal(false);

  constructor(private hostEl: ElementRef<HTMLElement>) {}

  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen.update(v => !v);
  }

  /** Closes on any click outside this component's own DOM subtree. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isOpen() && !this.hostEl.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.isOpen.set(false);
  }

  async openDocs() {
    const url = this.helpUrl();
    if (url) {
      try {
        await openUrl(url);
      } catch (err) {
        console.error('Failed to open documentation:', err);
      }
    }
  }
}