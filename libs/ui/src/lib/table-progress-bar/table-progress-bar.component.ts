import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl:'./table-progress-bar.component.html',
  styleUrl: './table-progress-bar.component.scss'
})
export class TableProgressBarComponent {
  visible = input.required<boolean>();
  progressValue = input.required<number>();
}