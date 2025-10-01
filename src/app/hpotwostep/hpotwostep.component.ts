import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TextAnnotationDto } from '../models/text_annotation_dto';
import { HpoMiningComponent } from '../hpomining/hpomining.component';
import { HpoPolishingComponent } from "../hpopolishing/hpopolishing.component";
import { HpoTermData } from '../models/hpo_term_dto';


@Component({
  selector: 'app-hpotwostep',
  standalone: true,
  templateUrl: './hpotwostep.component.html',
  imports: [HpoMiningComponent, HpoPolishingComponent],
})
export class HpoTwostepComponent {
  step = 1;
  annotations: TextAnnotationDto[] = [];

  constructor(private dialogRef: MatDialogRef<HpoMiningComponent>) {}

  onTextMiningSuccess(result: TextAnnotationDto[]) {
    this.annotations = result;
    console.log("HpoTwostepComponent - onTextMiningSuccess annotations=", this.annotations);
    this.step = 2;
  }

  onTextMiningError(message: string) {
    console.error('Text mining failed:', message);
  }

  /** return result to parent */
  onPolishingDone(finalAnnotations: HpoTermData[]) {
    this.dialogRef.close(finalAnnotations);  
  }

  close() {
    this.dialogRef.close();
  }
}
