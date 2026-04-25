import { Component, HostListener, inject, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TextAnnotationDto } from '../models/text_annotation_dto';
import { HpoMiningComponent } from '../hpomining/hpomining.component';
import { HpoPolishingComponent } from "../hpopolishing/hpopolishing.component";
import { HpoTermData } from '../models/hpo_term_dto';
import { MatIcon } from "@angular/material/icon";


@Component({
  selector: 'app-hpotwostep',
  standalone: true,
  templateUrl: './hpotwostep.component.html',
  styleUrl: './hpotwostep.component.scss',
  imports: [HpoMiningComponent, HpoPolishingComponent, MatIcon],
})
export class HpoTwostepComponent {
  step = 1;
  annotations: TextAnnotationDto[] = [];

  private dialogRef = inject(MatDialogRef<HpoMiningComponent>);
  @ViewChild(HpoPolishingComponent) polishingComp!: HpoPolishingComponent;

  onTextMiningSuccess(result: TextAnnotationDto[]) {
    this.annotations = result;
    this.step = 2;
  }

  onTextMiningError(message: string) {
    console.error('Text mining failed:', message);
  }

  /** return result to parent */
  onPolishingDone(result: HpoTermData[]) {
    this.dialogRef.close(result);  
  }

  onBackdropClick(event: MouseEvent) {
    this.close();
  }

  @HostListener('document:keydown.escape')
  onKeydownHandler() {
    this.close();
  }

  close() {
    this.dialogRef.close();
  }
}
