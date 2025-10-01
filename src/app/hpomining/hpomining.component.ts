import { Component, EventEmitter, Output } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { NotificationService } from '../services/notification.service';
import { TextAnnotationDto } from '../models/text_annotation_dto';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hpomining',
  templateUrl: './hpomining.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class HpoMiningComponent {
  pastedText = '';

  @Output() success = new EventEmitter<TextAnnotationDto[]>();
  @Output() error = new EventEmitter<string>();

  constructor(
    private configService: ConfigService,
    private notificationService: NotificationService
  ) {}

  async runTextMining(): Promise<void> {
    console.log("RUN TM")
    try {
      const result: TextAnnotationDto[] | string =
        await this.configService.map_text_to_annotations(this.pastedText);
        console.log("result=", result)
      if (typeof result === 'string') {
        this.notificationService.showError(result);
        this.error.emit(result);
      } else {
        this.success.emit(result);
      }
    } catch (err) {
      const message = String(err);
      this.notificationService.showError(message);
      this.error.emit(message);
    }
  }
}
