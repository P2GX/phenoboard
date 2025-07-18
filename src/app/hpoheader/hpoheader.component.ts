import { Component, EventEmitter, Input, Output } from "@angular/core";

interface HpoMappingResult {
  hpoLabel: string;
  hpoId: string;
  valueToStateMap: { [key: string]: 'observed' | 'excluded' | 'notApplicable' };
}


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

  confirm() {
    this.mappingConfirmed.emit({
      hpoLabel: this.hpoLabel,
      hpoId: this.hpoId,
      valueToStateMap: this.valueToStateMap,
    });
  }

  cancel() {
    this.cancelled.emit();
  }
}