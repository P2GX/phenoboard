import { Injectable } from '@angular/core';
import { invoke } from "@tauri-apps/api/core";
import { StatusDto } from '../models/status_dto';
import { PmidDto } from '../models/pmid_dto';
import { ParentChildDto, TextAnnotationDto } from '../models/text_annotation_dto';
import { GeneVariantBundleDto, IndividualDto, CohortDto, DiseaseGeneDto } from '../models/cohort_dto';
import { HpoTermDto } from '../models/hpo_annotation_dto';
import { HgvsVariant, StructuralVariant, VariantAnalysis, VariantValidationDto } from '../models/variant_dto';
import { ColumnTableDto } from '../models/etl_dto';


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

  async getPhetoolsTemplate(): Promise<CohortDto> {
    return await invoke<CohortDto>("get_phetools_template");
  }

  /**
   * This is called when the user wants to create a new template from scratch. 
   * @param dto DiseaseGeneDto information about the disease (label/id) and the gene (symbol/HGNC/transcript)
   * @param input Seed text from which we generate initial HPO columns
   * @returns 
   */
  async createNewTemplateFromSeeds(dto: DiseaseGeneDto, input: string):  Promise<CohortDto> {
    console.log("getNewTemplateFromSeeds in service", dto, input);
    return await invoke<CohortDto>("create_template_dto_from_seeds", {
      'dto': dto,
      'input': input,
    });
  }
  

  /** Load the version-one format Excel template (all of which are Mendelian) */
  async loadPtExcelTemplate(): Promise<CohortDto> {
    return await invoke<CohortDto>("load_phetools_excel_template", { "fixErrors": false});
  }

  /** Load an excel template file and try to fix some common errors (outdated HPO labels, whitespace) */
  async loadAndFixPtTemplate(): Promise<CohortDto> {
    return await invoke<CohortDto>("load_phetools_template", { "fixErrors": true});
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

  async getBestHpoMatch(value: string): Promise<string> {
    return invoke<string>('get_best_hpo_match', {query: value});
  }

  async submitAutocompleteHpoTerm(term_id: string, term_label:string): Promise<void> {
    return invoke<void>('submit_autocompleted_hpo_term', { termId: term_id, termLabel: term_label });
  }

  async validateHgvs(dto: VariantValidationDto, cohort_dto: CohortDto): Promise<HgvsVariant> {
    return invoke<HgvsVariant>('validate_hgvs_variant', {dto: dto, cohortDto: cohort_dto})
  }

  async validateSv(dto: VariantValidationDto, cohort_dto: CohortDto): Promise<StructuralVariant> {
    return invoke<StructuralVariant>('validate_structural_variant', {dto: dto, cohortDto: cohort_dto})
  }
  

   async saveCohort(cohort_dto: CohortDto): Promise<void> {
    return invoke<void>('save_template', {cohortDto: cohort_dto});
  }

  async validateCohort(cohort_dto: CohortDto): Promise<void> {
    return invoke<void>('validate_template', {cohortDto: cohort_dto});
  }

  async exportPpkt(cohort_dto: CohortDto): Promise<void> {
    return invoke<void>('export_ppkt', {cohortDto: cohort_dto});
  }

  /**
   * Add an HPO term to the current cohort. The column should show "na" for all phenopackets.
   * This enables us to add an HPO term and then edit it in the GUI.
   * @param id - The HPO term ID (e.g., "HP:0004322")
   * @param label - The human-readable label (e.g., "Seizures")
   */
  async addHpoToCohort(id: string, label: string, cohortDto: CohortDto): Promise<CohortDto> {
    return invoke<CohortDto>('add_hpo_term_to_cohort', 
        {hpoId: id, hpoLabel: label, cohortDto: cohortDto});
  }


  async addNewRowToCohort(
      individualDto: IndividualDto, 
      hpoAnnotations: HpoTermDto[],
      geneVariantList: GeneVariantBundleDto[],
      cohortDto: CohortDto): Promise<CohortDto> {
    return invoke<CohortDto>('add_new_row_to_cohort', 
      { individualDto, 
         hpoAnnotations,
         geneVariantList,
         cohortDto
      });
  }

  /**
   * Validate variants in the back end and return the results for display.
   * @param variantList: Variants derived from the template in the frontend
   * @returns List of the same variants, with the validated flag set to true if validations was 
   */
  async validateVariantDtoList(variantList: VariantValidationDto[]): Promise<VariantValidationDto[]> {
    return invoke<VariantValidationDto[]>('validate_variant_list_dto', {
        variantDtoList: variantList
    });
  }

  /**
   * Load an external Excel table (e.g., supplemental material) that we want to transform into a collection of phenopacket rows (columns based)
   */
  async loadExternalExcel(): Promise<ColumnTableDto> {
    return invoke<ColumnTableDto>("load_external_excel", {rowBased: false}
    );
  }

    /**
   * Load an external Excel table (e.g., supplemental material) that we want to transform into a collection of phenopacket rows (row-based)
   */
  async loadExternalExcelRowBased(): Promise<ColumnTableDto> {
    return invoke<ColumnTableDto>("load_external_excel", {rowBased: true});
  }


  async saveJsonExternalTemplate(template: ColumnTableDto) {
    await invoke('save_external_template_json', {  template });
  }

  async loadJsonExternalTemplate(): Promise<ColumnTableDto> {
    return await invoke('load_external_template_json');
  }

  async getCurrentOrcid(): Promise<string> {
    return await invoke<string>('get_biocurator_orcid');
  }

  async saveCurrentOrcid(orcid: string): Promise<void> {
    return await invoke('save_biocurator_orcid',{
      orcid
    });
  }

  /** This is called by the initialize of the VariantList component to show the variants that have been validated or that still need validation */
  async getVariantAnalysis(cohort: CohortDto): Promise<VariantAnalysis[]> {
    return await invoke<VariantAnalysis[]>('get_variant_analysis', {
      cohortDto: cohort
    });
  }

}
