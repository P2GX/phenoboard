import { Component, EventEmitter, forwardRef, Inject, Input, Optional, Output } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../services/config.service';
import { defaultPmidDto, PmidDto } from '../models/pmid_dto';

/** Widget to retrieve a PubMed identifier and title via API. Cab be used with or without angular forms */
@Component({
  selector: 'app-pubmed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pubmed.component.html',
  styleUrl: './pubmed.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PubmedComponent),
      multi: true,
    },
  ],
})
export class PubmedComponent implements ControlValueAccessor {
  constructor(private configService: ConfigService,
               @Optional() private dialogRef?: MatDialogRef<PubmedComponent>,
                    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
                    ) {
    if (data?.pmidDto) {
      this.pmidDto = data.pmidDto;
    }
  }

  @Input() pmidDto: PmidDto = defaultPmidDto();
  @Output() pmidDtoChange = new EventEmitter<PmidDto>(); 


  private onChange: (value: PmidDto) => void = (value) => {
  };
  private onTouched: () => void = () => {};

  // 🔹 Shared updater
  private updateValue(dto: PmidDto) {
    this.pmidDto = dto;
    this.pmidDtoChange.emit(this.pmidDto); // drives [(pmidDto)]
    this.onChange(this.pmidDto);           // drives reactive form
    this.onTouched();
  }

  async retrieve_pmid_title() {
    if (!this.pmidDto.pmid) return;
    const input = this.pmidDto.pmid.trim();
    try {
      const result: PmidDto = await this.configService.retrieve_pmid_title(input);
      result.hasError = false;
      result.retrievedPmid = true;
      this.updateValue(result);
    } catch (error) {
      const errorDto: PmidDto = {
        ...this.pmidDto,
        title: '',
        hasError: true,
        retrievedPmid: false,
        errorMessage: 'Error retrieving title: ' + String(error),
      };
      this.updateValue(errorDto);
    }
  }

  reset_pmid() {
    this.updateValue(defaultPmidDto());
  }

  getPmidDto(): PmidDto {
    return this.pmidDto;
  }

  isReady(): boolean {
    return this.pmidDto.pmid.length > 0 && this.pmidDto.title.length > 0;
  }

  // ===== ControlValueAccessor methods =====
  writeValue(value: PmidDto | null): void {
    if (value) {
      this.pmidDto = value;
    } else {
      this.pmidDto = defaultPmidDto();
    }
  }

  registerOnChange(fn: (value: PmidDto) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Optionally disable inputs
  }

  close(): void {
    this.dialogRef?.close(this.pmidDto); // return the dto to the caller
  }

  cancel(): void {
    this.dialogRef?.close(null);
  }
}
