import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../services/config.service';
import { IndividualDto, TemplateDto } from '../models/template_dto';

@Component({
  selector: 'app-pttemplate',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatTooltipModule],
  templateUrl: './pttemplate.component.html',
  styleUrls: ['./pttemplate.component.css'],
})
export class PtTemplateComponent implements OnInit {

  constructor(private configService: ConfigService) {}

  displayedColumns: string[] = [];
  tableData: TemplateDto | null = null;
  showPopup: IndividualDto | null = null;

  ngOnInit(): void {
    console.log("PtTemplateComponent - ngInit")
    this.configService.getPhetoolsTemplate().then((data: TemplateDto) => {
      this.tableData = data;
      this.displayedColumns = data.header.data.map(h => {
        return h.h1 
      });
      console.log(data);
       console.log('typeof rows:', typeof data.rows);
      console.log('Row example:', data.rows[0]);
    });
  }



  
}
