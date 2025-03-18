import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss',
  standalone: true,
 // imports: [CommonModule, BrowserAnimationsModule],
  //providers: [CommonModule, BrowserAnimationsModule],
})
export class HelpComponent {
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
        <h3>Introduction</h3>
        <p>Welcome to the HPO Curator! This tool helps you perform text mining and analysis efficiently.</p>
        <p>Key features include:</p>
        <ul>
          <li>Creation of new phenopacket cohort templates</li>
          <li>Named entity recognition (mining) of clinical texts</li>
          <li>Editing templates</li>
          <li>GA4GH Phenopacket Q/C and export</li>
        </ul>
      `,
      newtemplate: `
        <h3>New Pyphetools Phenopacket Template</h3>
        <p>To get started, select a data file from the main page. The text mining feature allows you to extract key insights from your data.</p>
        <p>For advanced configuration, visit the <strong>Settings</strong> page.</p>
      `,
      about: `
        <h3>HPO Curator</h3>
        <p>Create pyphetools templates for curating literature and creating GA4GH phenopackets.</p>
        <p>Start by creating or loading a pyphetools template. </p>
        <p>Version: 0.1.8</p>
      `,
    };
    this.content = helpTexts[topic] || '<p>No content available for this topic.</p>';
  }
}