import { Component, input } from "@angular/core";
import { DisplayDiseaseComponent } from "./display-disease.component";
import { DiseaseData } from "../models/cohort_dto";

@Component({
  selector: 'app-display-melded',
  standalone: true,
  imports: [DisplayDiseaseComponent],
  template: `
    <div class="summary-card">
      <p class="font-bold text-purple-700 mb-2">Melded Cohort: {{ acronym() }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span class="text-xs font-bold uppercase text-gray-500">Source A</span>
          <app-display-disease [disease]="diseaseA()" />
        </div>
        <div>
          <span class="text-xs font-bold uppercase text-gray-500">Source B</span>
          <app-display-disease [disease]="diseaseB()" />
        </div>
      </div>
    </div>
  `
})
export class DisplayMeldedComponent {
  diseaseA = input.required<DiseaseData>();
  diseaseB = input.required<DiseaseData>();
  acronym = input.required<string>();
}