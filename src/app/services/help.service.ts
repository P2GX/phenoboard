import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HelpService {
 
  private readonly HELP_MAP: Record<string, string> = {
    'home': 'overview',
    'start': 'start',
    'addcase': 'case',
    'cohort-editor': 'cohort-editor',
    'table-editor': 'table-editor',
    'repo': 'repo',
    'variant': 'variant'
  };
  
  private readonly  BASE_HELP_URL = 'https://p2gx.github.io/phenoboard/help/';
  private currentUrlSource = new BehaviorSubject<string>(this.BASE_HELP_URL + 'overview');
  currentUrl$ = this.currentUrlSource.asObservable();

  /**
   * Sets the help context based on a predefined key
   * @param key The key from HELP_MAP (e.g., 'dashboard')
   */
  setHelpContext(key: string) {
    const path = this.HELP_MAP[key] || this.HELP_MAP['home'];
    this.currentUrlSource.next(`${this.BASE_HELP_URL}${path}`);
  }

  getCurrentUrlValue(): string {
    return this.currentUrlSource.getValue();
  }
}