import { Injectable, numberAttribute } from '@angular/core';
import { invoke } from "@tauri-apps/api/core";
import { StatusDto } from '../models/status_dto';
import { PmidDto } from '../models/pmid_dto';
import { ParentChildDto, TextAnnotationDto } from '../models/text_annotation_dto';
import { GeneVariantBundleDto, IndividualDto, TemplateDto } from '../models/template_dto';
import { HpoTermDto } from '../models/hpo_annotation_dto';
import { VariantDto, VariantListDto } from '../models/variant_dto';

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

  async loadHPO(): Promise<void> {
    return await invoke("load_hpo");
  }


  async getHpJsonPath(): Promise<string | string> {
    return await invoke<string | string>("get_hp_json_path");
  }

  async selectPhetoolsTemplatePath(): Promise<string|string> {
    return await invoke<string|string>("select_phetools_template_path");
  }

  async getPhetoolsTemplate(): Promise<TemplateDto> {
    return await invoke<TemplateDto>("get_phetools_template");
  }

  async loadPtTemplate(): Promise<void> {
    return await invoke<void>("load_phetools_template");
  }

  async fetchStatus(): Promise<void> {
    const status: StatusDto = await invoke('get_status');
    console.log('Status received:', status);
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

  async emitStatusFromBackend(): Promise<void> {
    return await invoke("emit_backend_status");
  }

  async highlight_hpo_mining(input_text: string): Promise<string> {
    return await invoke("highlight_text_with_hits", {inputText: input_text});
  }

  async retrieve_pmid_title(input_pmid: string): Promise<PmidDto> {
    return await invoke("fetch_pmid_title", {input: input_pmid});
  }

  async map_text_to_annotations(input_text: string):  Promise<TextAnnotationDto[] | string> {
    return await invoke("map_text_to_annotations", {inputText: input_text});
  }

  async getHpoParentAndChildTerms(annotation: TextAnnotationDto): Promise<ParentChildDto> {
  return await invoke("get_hpo_parent_and_children_terms", {annotation: annotation});
}


  async getAutocompleteHpo(value: string): Promise<string[]> {
    return invoke<string[]>('get_hpo_autocomplete_terms', { query: value });
  }

  async submitAutocompleteHpoTerm(term_id: string, term_label:string): Promise<void> {
    return invoke<void>('submit_autocompleted_hpo_term', { termId: term_id, termLabel: term_label });
  }

  async submitVariantDto(dto: VariantDto): Promise<VariantDto> {
    return invoke<VariantDto>('submit_variant_dto', {variantDto: dto});
  }
  
  async validateCohort(cohort_dto: TemplateDto): Promise<void> {
    return invoke<void>('validate_template', {cohortDto: cohort_dto});
  }

  /**
   * Add an HPO term to the current cohort. The column should show "na" for all phenopackets.
   * This enables us to add an HPO term and then edit it in the GUI.
   * @param id - The HPO term ID (e.g., "HP:0004322")
   * @param label - The human-readable label (e.g., "Seizures")
   */
  async addHpoToCohort(id: string, label: string, cohortDto: TemplateDto): Promise<void> {
    return invoke<void>('add_hpo_term_to_cohort', 
        {hpoId: id, hpoLabel: label, cohortDto: cohortDto});
  }


  async addNewRowToCohort(
      individual_dto: IndividualDto, 
      hpo_annotations: HpoTermDto[],
      gene_variant_list: GeneVariantBundleDto[],
      template_dto: TemplateDto): Promise<TemplateDto> {
    console.log("service - addNewRowToCohort, indiv", individual_dto);
    console.log("service - addNewRowToCohort, hpo", hpo_annotations);
    console.log("template dto", template_dto);

    return invoke<TemplateDto>('add_new_row_to_cohort', 
      {individualDto: individual_dto, 
        hpoAnnotations: hpo_annotations,
        geneVariantList: gene_variant_list,
        templateDto: template_dto
      });
  }

  async getVariantList(): Promise<VariantListDto> {
    return invoke<VariantListDto>('get_variant_list_dto');
  }

}
