import { Component, ElementRef, ViewChild, AfterViewInit, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HpoStatus, HpoTermDuplet } from '../../../libs/ui/src/lib/models/hpo_term_dto';

const VALUE_TO_STATE: Record<string, HpoStatus> = {
  '+': 'observed',
  Yes: 'observed',
  yes: 'observed',
  Y: 'observed',
  y: 'observed',
  No: 'excluded',
  no: 'excluded',
  N: 'excluded',
  n: 'excluded',
  '-': 'excluded',
  '–': 'excluded', // en dash
  '—': 'excluded', // em dash
  na: 'na',
  Mild: 'observed;HP:0012825', // Mild (HP:0012825)
  mild: 'observed;HP:0012825',
  Moderate: 'observed;HP:0012826', // Moderate (HP:0012826)
  moderate: 'observed;HP:0012826',
  'Mod.': 'observed;HP:0012826',
  'mod.': 'observed;HP:0012826',
  Severe: 'observed;HP:0012828', // Severe (HP:0012828)
  severe: 'observed;HP:0012828',
  'Sev.': 'observed;HP:0012828',
  'sev.': 'observed;HP:0012828',
};

export interface ValueMappingData {
  header: string;
  hpoTerm: HpoTermDuplet;
  uniqueValues: string[];
}

@Component({
  selector: 'app-value-mapping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './valuemapping.component.html',
  styleUrls: ['./valuemapping.component.scss'],
})
export class ValueMappingComponent implements OnInit, AfterViewInit {
  readonly data = input.required<ValueMappingData>();
  readonly closed = output<{ valueToStateMap: { [key: string]: HpoStatus }; hpoId: string; hpoLabel: string } | null>();

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLDialogElement>;

  /* key: An entry in a column, e.g., 'yes'; value: corresponding phenoboard value, e.g., 'observed' */
  valueToStateMap: { [key: string]: HpoStatus } = {};

  public hpoId = signal('');
  public hpoLabel = signal('');
  public header = signal('');
  public uniqueValues = signal<string[]>([]);

  ngOnInit(): void {
    const inputData = this.data();
    if (inputData) {
      this.hpoId.set(inputData.hpoTerm.hpoId);
      this.hpoLabel.set(inputData.hpoTerm.hpoLabel);
      this.header.set(inputData.header);
      this.uniqueValues.set(inputData.uniqueValues);

      inputData.uniqueValues.forEach((val) => {
        this.valueToStateMap[val] = VALUE_TO_STATE[val.trim()] ?? 'na';
      });
    }
  }

  ngAfterViewInit() {
    if (this.dialogEl?.nativeElement) {
      this.dialogEl.nativeElement.showModal();
    }
  }

  onSave(): void {
    const hpoMapResult = {
      valueToStateMap: this.valueToStateMap,
      hpoId: this.hpoId(),
      hpoLabel: this.hpoLabel(),
    };
    this.dialogEl?.nativeElement.close();
    this.closed.emit(hpoMapResult);
  }

  onCancel(): void {
    this.dialogEl?.nativeElement.close();
    this.closed.emit(null);
  }
}