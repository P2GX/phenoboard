import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ConfigService } from '../services/config.service';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';
import { TemplateDtoService } from '../services/template_dto_service';
import { TemplateDto } from '../models/template_dto';


import { MatIconModule } from "@angular/material/icon";
import { ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { ColumnTableDto } from '../models/etl_dto';


@Component({
  selector: 'app-tableeditor',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule],
  templateUrl: './tableeditor.component.html',
  styleUrls: ['./tableeditor.component.css'],
})
export class TableEditorComponent extends TemplateBaseComponent implements OnInit, OnDestroy {


@ViewChild(MatPaginator) paginator!: MatPaginator;
// Data properties
tableData: ColumnTableDto | null = null;
processedData: any[] = [];
filteredData: any[] = [];
dataSource = new MatTableDataSource<any[]>([]);
displayedColumns: string[] = [];

// UI state
isLoading = false;
errorMessage = '';
searchTerm = '';
pageSize = 25;
selectedRows = new Set<any>();

// Editing state
editingCell: { row: number, col: number } | null = null;
editingValue = '';
activeColumn = -1;
activeRow = -1;


  
 
  constructor(private configService: ConfigService, 
    templateService: TemplateDtoService,
    ngZone: NgZone,
    cdRef: ChangeDetectorRef
  ) {
    super(templateService, ngZone, cdRef);
  }
  
  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  protected override onTemplateLoaded(template: TemplateDto): void {
    console.log("TableEditorComponent:onTemplateLoaded");
  }

 
  loadExcel() {
    console.log('loadExcel');
    this.configService.loadExternalExcel();
}






  
  
}
