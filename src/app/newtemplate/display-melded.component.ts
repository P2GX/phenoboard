import { Component, input } from "@angular/core";
import { DisplayDiseaseComponent } from "./display-disease.component";
import { DiseaseData } from "../models/cohort_dto";

@Component({
  selector: 'app-display-melded',
  standalone: true,
  imports: [DisplayDiseaseComponent],
  template: `
    <div class="summary-card">
      <p>Melded Cohort: {{ acronym() }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (disease of diseases(); track $index) {
          <div>
          <span class="text-xs font-bold uppercase text-gray-500">Disease {{ $index + 1 }}</span>
            <app-display-disease [disease]="disease" />
          </div>
        }
      </div>
    </div>
  `
})
export class DisplayMeldedComponent {
  diseases = input.required<DiseaseData[]>();
  acronym = input.required<string>();
}