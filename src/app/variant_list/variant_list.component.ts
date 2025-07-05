import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { TemplateDtoService } from '../services/template_dto_service';
import { take } from 'rxjs/operators';
import { VariantDto } from '../models/variant_dto';


@Component({
  selector: 'app-variant_list',
  standalone: true,
  imports:[CommonModule, FormsModule, MatButtonModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatSelectModule],
  templateUrl: './variant_list.component.html',
  styleUrls: ['./variant_list.component.css']
})
export class VariantListComponent implements OnInit {

  errorMessage: string | null = null;
  

  constructor(
    private configService: ConfigService, 
    private templateService: TemplateDtoService) {}

  async ngOnInit() {
    this.templateService.template$.pipe(take(1)).subscribe(() => {
          // This makes sure the template service is fully available
        });
    const variant_dtos = this.templateService.getVariantDtos();
    try {
      this.variantListDto = await this.configService.validateVariantDtoList(variant_dtos);
    } catch (err) {
      this.errorMessage = String(err);
    }
  }

    variantListDto: VariantDto[] | [] = [];

    
}

