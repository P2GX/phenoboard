import { Component, EventEmitter, Input, Output } from "@angular/core";
import { HpoMappingResult } from "../models/hpo_mapping_result";




@Component({
  selector: 'app-hpo-mapping-dialog',
  template: './hpoheader.component.html',
})
export class HpoHeaderComponent {
  @Input() header!: string;
  @Input() hpoLabel!: string;
  @Input() hpoId!: string;
  @Input() uniqueValues!: string[];

  valueToStateMap: { [key: string]: 'observed' | 'excluded' | 'notApplicable' } = {};

  @Output() mappingConfirmed = new EventEmitter<HpoMappingResult>();
  @Output() cancelled = new EventEmitter<void>();

  confirm(): void {
    this.mappingConfirmed.emit({
      hpoLabel: this.hpoLabel,
      hpoId: this.hpoId,
      valueToStateMap: this.valueToStateMap,
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}