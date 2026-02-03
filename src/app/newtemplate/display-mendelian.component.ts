import { Component, input } from "@angular/core";
import { DiseaseData } from "../models/cohort_dto";
import { DisplayDiseaseComponent } from "./display-disease.component";

@Component({
  selector: 'app-display-mendelian',
  standalone: true,
  imports: [DisplayDiseaseComponent],
  template: `
    <div class="summary-card">
      <p class="font-bold text-blue-700 mb-2">Acronym: {{ acronym() }}</p>
      <app-display-disease [disease]="disease()" />
    </div>
  `
})
export class DisplayMendelianComponent {
  disease = input.required<DiseaseData>();
  acronym = input.required<string>();
}