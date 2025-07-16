import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { TemplateDtoService } from '../services/template_dto_service';
import { VariantDto } from '../models/variant_dto';
import { TemplateDto } from '../models/template_dto';
import { TemplateBaseComponent } from '../templatebase/templatebase.component';


@Component({
  selector: 'app-variant_list',
  standalone: true,
  imports:[CommonModule, FormsModule, MatButtonModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatSelectModule],
  templateUrl: './variant_list.component.html',
  styleUrls: ['./variant_list.component.css']
})
export class VariantListComponent extends TemplateBaseComponent implements OnInit, OnDestroy {
  protected override onTemplateLoaded(template: TemplateDto): void {
    throw new Error('Method not implemented.');
  }
  constructor(
    private configService: ConfigService, 
    override templateService: TemplateDtoService,
    ngZone: NgZone, 
    override cdRef: ChangeDetectorRef) {
      super(templateService, ngZone, cdRef)
    }

  errorMessage: string | null = null;
  variantListDto: VariantDto[] | [] = [];
  tableData: TemplateDto | null = null;

  override async ngOnInit() {
    super.ngOnInit();

    const variant_dtos = this.templateService.getVariantDtos();
    try {
      this.variantListDto = await this.configService.validateVariantDtoList(variant_dtos);
    } catch (err) {
      this.errorMessage = String(err);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
  }



    
}

