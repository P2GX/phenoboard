import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AccordionModule } from "primeng/accordion";

@Component({
  selector: 'app-help',
  templateUrl: './tutorial.component.html',
  styleUrl: './tutorial.component.scss',
  imports: [AccordionModule],
  standalone: true
})
export class TutorialComponent {
  topic = '';
  content = '';

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.topic = params['topic'];
      this.loadContent(this.topic);
    });
  }

  loadContent(topic: string) {
    const helpTexts: { [key: string]: string } = {
      introduction: `
      
      `,
      newtemplate: `
        <h3>New Pyphetools Phenopacket Template</h3>
        <p>To get started, select a data file from the main page. The text mining feature allows you to extract key insights from your data.</p>
        <p>For advanced configuration, visit the <strong>Settings</strong> page.</p>
      `,
      about: `
        <h3>Phenotype Template Cohort Curator (FTC2)</h3>
        <p>Create pyphetools templates for curating literature and creating GA4GH phenopackets.</p>
        <p>Start by creating or loading a pyphetools template. </p>
        <p>Version: 0.1.8</p>
      `,
    };
    this.content = helpTexts[topic] || '<p>No content available for this topic.</p>';
  }
}
