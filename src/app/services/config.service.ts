import { Injectable } from '@angular/core';
import { invoke } from "@tauri-apps/api/core";

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  constructor() {}

  /*async getSavedDownloadPath(): Promise<string | null> {
    return await invoke<string | null>('get_saved_download_path');
  }*/

  async saveHpJsonPath(path: string): Promise<void> {
    await invoke('save_hp_json_path', { hpJsonPath:  path });
  }

  async selectHpJsonFile(): Promise<string | null> {
    return await invoke<string | null>('select_hp_json_download_path');
  }

  async loadOntologyAndGetVersion(path: string): Promise<string> {
    return await invoke<string | string>("initialize_hpo_and_get_version", { hpJsonPath:  path });
  }
}
