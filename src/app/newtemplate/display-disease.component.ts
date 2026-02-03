import { Component, input } from "@angular/core";
import { DiseaseData } from "../models/cohort_dto";
import { CommonModule } from "@angular/common";


@Component({
  selector: 'app-display-disease',
  standalone: true,
  imports: [CommonModule],
  template: `
    <table class="min-w-full border border-gray-300 rounded-md mb-4">
      <tbody>
        <tr>
          <td class="font-semibold p-2 bg-gray-50 w-1/3">Disease</td>
          <td class="p-2">{{ disease().diseaseLabel }} - {{ disease().diseaseId }}</td>
        </tr>
        <tr>
          <td class="font-semibold p-2 bg-gray-50">Gene(s)</td>
          <td class="p-2">
            @for (g of disease().geneTranscriptList; track g.geneSymbol){
                <div  class="text-sm">
                    <strong>{{ g.geneSymbol }}</strong> ({{ g.hgncId }}) — {{ g.transcript }}
                </div>
            }
           
          </td>
        </tr>
      </tbody>
    </table>
  `
})
export class DisplayDiseaseComponent {
  disease = input.required<DiseaseData>(); 
}