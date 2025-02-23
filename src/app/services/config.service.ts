import { Injectable } from '@angular/core';
import { invoke } from "@tauri-apps/api/core";

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  constructor() {}

  async getSavedDownloadPath(): Promise<string | null> {
    return await invoke<string | null>('get_saved_download_path');
  }

  async saveDownloadPath(path: string): Promise<void> {
    await invoke('save_download_path', { path });
  }

  async selectDownloadDirectory(): Promise<string | null> {
    return await invoke<string | null>('select_download_directory');
  }
}
