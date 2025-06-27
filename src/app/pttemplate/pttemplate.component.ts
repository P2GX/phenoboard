import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { DiseaseDto, GeneVariantBundleDto, HeaderDupletDto, IndividualDto, TemplateDto } from '../models/template_dto';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { IndividualEditDialogComponent } from '../individual_edit/individual_edit.component'; // adjust path as needed



@Component({
  selector: 'app-pttemplate',
  standalone: true,
  imports: [ CommonModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule,
    IndividualEditDialogComponent],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
})
export class PtTemplateComponent implements OnInit {

  constructor(private configService: ConfigService, private dialog: MatDialog) {}


  tableData: TemplateDto | null = null;
  hoveredIndividual: IndividualDto | null = null;
  hoveredDisease: DiseaseDto | null = null;
  hoveredGene: GeneVariantBundleDto | null = null;
  hoveredHpoHeader: HeaderDupletDto | null = null;

  ngOnInit(): void {
    console.log("PtTemplateComponent - ngInit")
    this.configService.getPhetoolsTemplate().then((data: TemplateDto) => {
      this.tableData = data;
 
      
      
      console.log(data);
      console.log('Row example:', data.rows[0]);
    });
  }


openIndividualEditor(individual: IndividualDto) {
  const dialogRef = this.dialog.open(IndividualEditDialogComponent, {
    width: '500px',
    data: { ...individual }, // pass a copy
  });

  dialogRef.afterClosed().subscribe((result: IndividualDto | null) => {
    if (result) {
      // Apply changes back to the original
      Object.assign(individual, result);
      // Optional: trigger change detection or save to backend
    }
  });
}
  
}
