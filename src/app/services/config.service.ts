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

  async saveHpJsonPath(path: string): Promise<void> {
    await invoke('save_hp_json_path', { path });
  }

  async selectHpJsonFile(): Promise<string | null> {
    return await invoke<string | null>('select_hp_json_download_path');
  }
}
