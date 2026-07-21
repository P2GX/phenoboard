import { Component, input, output, effect, viewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HpoMappingResult } from "@workspace/ui";


type MappingState = 'observed' | 'excluded' | 'na';


@Component({
  selector: 'app-hpo-mapping-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hpo-mapping-step.component.html',
  styleUrl: './hpo-mapping-step.component.scss'
})
export class HpoMappingStepComponent {
  header = input.required<string>();
  hpoLabel = input.required<string>();
  hpoId = input.required<string>();
  uniqueValues = input.required<string[]>();

  OBSERVED_HINTS = new Set([
    '+', 'yes', 'y', 'true', '1', 'present', 'pos', 'positive', 'obs', 'observed'
  ]);

   EXCLUDED_HINTS = new Set([
    '+', 'yes', 'y', 'true', '1', 'present', 'pos', 'positive', 'obs', 'observed'
  ]);




   inferStateFromRawValue(raw: string): MappingState {
    const normalized = raw.trim().toLowerCase();
    if (this.OBSERVED_HINTS.has(normalized)) {
      return 'observed';
    } else if (this.EXCLUDED_HINTS.has(normalized)) {
      return 'excluded';
    } else {
      return 'na';
    }
  }

  // A plain mutable dictionary property handles [(ngModel)] bindings best 
  valueToStateMap: { [key: string]: 'observed' | 'excluded' | 'na' } = {};

  mappingConfirmed = output<HpoMappingResult>();
  cancelled = output<void>();

  private dialogElement = viewChild<ElementRef<HTMLDialogElement>>('nativeMappingDialog');

  constructor() {
    effect(()=> {
        const dialog = this.dialogElement()?.nativeElement;
        if (dialog && !dialog.open) {
            dialog.showModal(); 
        }
    });
        effect(() => {
      const values = this.uniqueValues();
      for (const value of values) {
        if (!(value in this.valueToStateMap)) {
          const inferred = this.inferStateFromRawValue(value);
      console.log(`inferring "${value}" ->`, inferred);
          this.valueToStateMap[value] = this.inferStateFromRawValue(value);
        }
      }
    });
  }

  confirm(): void {
    const dialog = this.dialogElement()?.nativeElement;
    if (dialog) dialog.close();
    // Fill in default values for any keys the user skipped picking a select option for
    this.uniqueValues().forEach(value => {
      if (!this.valueToStateMap[value]) {
        this.valueToStateMap[value] = 'na';
      }
    });

    this.mappingConfirmed.emit({
      hpoLabel: this.hpoLabel(),
      hpoId: this.hpoId(),
      valueToStateMap: this.valueToStateMap,
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}