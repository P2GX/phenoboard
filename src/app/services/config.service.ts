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

  async loadHumanPhenotypeOntology(hpJsonPath: string): Promise<void> {
    return await invoke("load_hpo_from_hp_json", { hpoJsonPath:  hpJsonPath });
  }

  async getHpoVersion(): Promise<string | string > {
    return await invoke<string | string>("get_hpo_version");
  }

  async getHpJsonPath(): Promise<string | string> {
    return await invoke<string | string>("get_hp_json_path");
  }

  async hpoInitialized(): Promise<boolean > {
    return await invoke<boolean>("hpo_initialized");
  }
}
