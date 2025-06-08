import { Injectable, numberAttribute } from '@angular/core';
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

  async getPhetoolsMatrix(): Promise<string[][]> {
    return await invoke<string[][]>("get_phetools_table");
  }

  async loadExistingPhetoolsTemplate(ptTemplatePath: string): Promise<void> {
    //return await invoke();
  }

  async hpoInitialized(): Promise<boolean > {
    return await invoke<boolean>("hpo_initialized");
  }

  async checkReadiness(): Promise<boolean > {
    return await invoke<boolean>("check_if_phetools_is_ready");
  }

  async processRightClickPhetoolsMatrix(item: string, row: number, col: number): Promise<boolean> {
    return await invoke('process_pyphetools_table_rclick', { 
      value: item, 
      row: row,
      col: col });
  }

  // Get a column together with context for editing
  async getPhetoolsColumn(col: number): Promise<string [][]> {
    return await invoke('get_phetools_column', { 
      col: col });
  }

  // Get a column together with context for editing
  async getSelectedPhetoolsColumn(): Promise<string [][]> {
    return await invoke('get_selected_phetools_column');
  }


  // use when we are editing a specific column, the backend will know the current column
  // used when we have the GUI show us one specific column for editing
  async  editCellOfCurrentColumn(value: string, row: number): Promise<void> {
    return await invoke('edit_current_column', {value: value, row: row});
  }


  async getTemplateSummary(): Promise<Record<string, string>> {
    return await invoke('get_template_summary');
  }

  async getHpoData(): Promise<Record<string, string>> {
    return await invoke("get_hpo_data");
  }

  async getPhenopacketStoreStructure(): Promise<string | string> {
    return await invoke("get_ppkt_store_json");
  }

  async updateDescriptiveStats(): Promise<void> {
    return await invoke("update_descriptive_stats");
  }

}
