import { Component, inject, signal, computed, input, output, effect, ViewChild, ElementRef, AfterViewInit, viewChild, afterEveryRender, afterNextRender } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgeInputService } from '../services/age_service';

@Component({
  selector: 'app-addage',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './addage.component.html',
  styleUrl: './addage.component.scss',
})
export class AddageComponent {
  private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('ageDialogElement');
  private ageService = inject(AgeInputService);

  current = input<string>('');
  saved = output<string>();
  cancelled = output<void>();

  readonly existingAgeStrings = this.ageService.selectedTerms;
  customAge = signal('');
  readonly existingTerms = this.ageService.allAvailableTerms;

  filteredTerms = computed(() => {
    const typed = this.customAge().trim().toLowerCase();
    // If empty or already a typed exact match or custom format draft, clear suggestions
    if (!typed || (typed.startsWith('p') && typed.length > 3)) {
      return [];
    }

    return this.existingTerms().filter((t) => t.toLowerCase().includes(typed));
  });

  constructor() {
    effect(() => {
      const initial = this.current();
      if (!initial || initial === 'na') {
        this.customAge.set('');
      } else {
        this.customAge.set(initial);
      }
    });

    afterNextRender(()=> {
      const modal = this.dialogEl().nativeElement;
      if (!modal.open) {
        modal.showModal();
      }
    });
  }

  selectExisting(term: string): void {
    if (term) {
      this.ageService.addSelectedTerm(term);
      this.close();
      this.saved.emit(term);
    }
  }

  createNewAge(): void {
    const val = this.customAge().trim();
    if (!val) return;

    if (this.ageService.validateAgeInput(val)) {
      this.ageService.addSelectedTerm(val);
      this.close();
      this.saved.emit(val);
    } else {
      alert('Invalid format. Please use ISO8601 (e.g. P1Y) or Gestational (e.g. G20w).');
    }
  }

  onCancel(): void {
    this.close();
    this.cancelled.emit();
  }

  private close(): void {
    const modal = this.dialogEl().nativeElement;
    if (modal.open) {
      modal.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl().nativeElement) {
      this.onCancel();
    }
  }
}
