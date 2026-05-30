import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import { HpoTermDuplet } from '../models/hpo_term_dto';
import { NotificationService } from './notification.service';

export interface HpoOption {
  id: string;
  label: string;
}

@Injectable({
  providedIn: 'root', // 👈 This makes it a singleton across the app
})
export class HpoModifierService {
  private configService = inject(ConfigService);
  private notificationService = inject(NotificationService);
  
  // Cache the master list of ~250 modifiers
  private modifierList = signal<HpoTermDuplet[]>([]);
  private isLoading = signal<boolean>(false);

  async ensureModifiersLoaded() {
    if (this.modifierList().length > 0 || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const terms = await this.configService.getModifiers();
      this.modifierList.set(terms);
    } catch (error) {
        this.notificationService.showError(`Failed to load HPO modifiers: ${error}.`);
    } finally {
      this.isLoading.set(false);
    }
  }

  // For autocomplete
  filterLocalTerms(query: string): HpoTermDuplet[] {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return this.modifierList();

    return this.modifierList().filter(option => 
      option.hpoLabel.toLowerCase().includes(cleanQuery) || 
      option.hpoId.toLowerCase().includes(cleanQuery)
    );
  }
}