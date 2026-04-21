import { Component, input } from "@angular/core";
import { DiseaseData } from "../models/cohort_dto";



@Component({
  selector: 'app-display-disease',
  standalone: true,
  imports: [],
  template: `
    <table class="dashboard-table">
      <tbody>
        <tr>
          <td class="label-cell">Disease</td>
          <td class="content-cell">{{ disease().diseaseLabel }} - {{ disease().diseaseId }}</td>
        </tr>
        <tr>
          <td class="label-cell">Gene(s)</td>
          <td class="content-cell">
            @for (g of disease().geneTranscriptList; track g.geneSymbol){
                <div class="gene-item">
                    <span class="gene-symbol">{{ g.geneSymbol }}</span> 
                    <span class="sub-text">({{ g.hgncId }})</span> 
                    <span class="transcript-info">— {{ g.transcript }}</span>
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