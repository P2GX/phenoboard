import { Component, input } from '@angular/core';
import { ModeOfInheritance } from '../models/cohort_dto'; // adjust path
import { getMoiAbbreviation } from '../models/moi-abbreviations';

@Component({
  selector: 'hpo-moi-badges',
  templateUrl: './moi-badges.component.html',
  styleUrls: ['./moi-badges.component.scss'],
  standalone: true,
})
export class MoiBadgesComponent {
  modeOfInheritanceList = input.required<ModeOfInheritance[]>();
  getMoiAbbreviation = getMoiAbbreviation;
}