import { Component, input, output, effect, viewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HpoMappingResult } from "@workspace/ui";

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

  // A plain mutable dictionary property handles [(ngModel)] bindings best 
  valueToStateMap: { [key: string]: 'observed' | 'excluded' | 'notApplicable' } = {};

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
  }

  confirm(): void {
    const dialog = this.dialogElement()?.nativeElement;
    if (dialog) dialog.close();
    // Fill in default values for any keys the user skipped picking a select option for
    this.uniqueValues().forEach(value => {
      if (!this.valueToStateMap[value]) {
        this.valueToStateMap[value] = 'notApplicable';
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