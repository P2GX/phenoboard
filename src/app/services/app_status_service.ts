import { Injectable, signal, inject, NgZone, computed } from '@angular/core';
import { listen } from '@tauri-apps/api/event';
import { StatusDto, defaultStatusDto } from '../models/status_dto';
import { NotificationService } from './notification.service';
import { ConfigService } from './config.service';
import { invoke } from '@tauri-apps/api/core';

@Injectable({ providedIn: 'root' })
export class AppStatusService {
  private ngZone = inject(NgZone);
  private notificationService = inject(NotificationService);
  private configService = inject(ConfigService);

  // Raw state from the backend
  readonly state = signal<StatusDto>(defaultStatusDto());
  
  // Derived UI states
  readonly hpoLoading = signal<boolean>(false);
  readonly hpoLoaded = computed(() => this.state().hpoLoaded);

  constructor() {
    this.init();
    this.setupListeners();
  }

  private async init() {
    try {
      const status: StatusDto = await invoke('get_status_dto');
      this.state.set(status);
     } catch (err) {
      console.error("Failed to fetch initial backend status", err);
    }
  }

  private async setupListeners() {
    await listen("hpo-load-event", (event) => {
      const { status, message, data } = event.payload as { 
        status: 'loading' | 'success' | 'error' | 'cancel', 
        message?: string, 
        data?: StatusDto 
      };

      this.ngZone.run(() => {
        switch (status) {
          case 'loading':
            this.hpoLoading.set(true);
            break;
          case 'success':
            this.hpoLoading.set(false);
            if (data) {
              this.state.set(data);
            }
            this.configService.resetPtTemplate();
            break;
          case 'error':
            this.hpoLoading.set(false);
            this.notificationService.showError(message || 'Unknown error');
            break;
          case 'cancel':
            this.hpoLoading.set(false);
            break;
        }
      });
    });
  }
}