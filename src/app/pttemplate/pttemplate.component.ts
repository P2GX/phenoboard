import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { DemographicDto, DiseaseDto, GeneVariantBundleDto, HeaderDupletDto, IndividualDto, TemplateDto } from '../models/template_dto';

@Component({
  selector: 'app-pttemplate',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatTooltipModule],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
})
export class PtTemplateComponent implements OnInit {

  constructor(private configService: ConfigService) {}


  tableData: TemplateDto | null = null;
  hoveredIndividual: IndividualDto | null = null;
  hoveredDisease: DiseaseDto | null = null;
  hoveredGene: GeneVariantBundleDto | null = null;
  hoveredDemographics: DemographicDto | null = null;
  hoveredHpoHeader: HeaderDupletDto | null = null;

  ngOnInit(): void {
    console.log("PtTemplateComponent - ngInit")
    this.configService.getPhetoolsTemplate().then((data: TemplateDto) => {
      this.tableData = data;
 
      
      
      console.log(data);
      console.log('Row example:', data.rows[0]);
    });
  }



  
}
