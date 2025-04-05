import { Injectable } from '@angular/core';
import { invoke } from "@tauri-apps/api/core";

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  constructor() {}

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

  async selectPhetoolsTemplatePath(): Promise<string|string> {
    return await invoke<string|string>("select_phetools_template_path");
  }

  async loadExistingPhetoolsTemplate(ptTemplatePath: string): Promise<void> {
    //return await invoke();
  }

  async hpoInitialized(): Promise<boolean > {
    return await invoke<boolean>("hpo_initialized");
  }
}
