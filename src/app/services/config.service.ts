import { Injectable } from '@angular/core';
import { invoke } from "@tauri-apps/api/core";
import { StatusDto } from '../models/status_dto';
import { PmidDto } from '../models/pmid_dto';
import { ParentChildDto, TextAnnotationDto } from '../models/text_annotation_dto';
import { GeneVariantData, IndividualData, CohortData, DiseaseData, CohortType } from '../models/cohort_dto';
import { HpoTermData, HpoTermDuplet } from '../models/hpo_term_dto';
import { HgvsVariant, StructuralVariant, VariantDto } from '../models/variant_dto';
import { ColumnTableDto, EtlDto } from '../models/etl_dto';


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

  async getPhetoolsTemplate(): Promise<CohortData> {
    return await invoke<CohortData>("get_phetools_template");
  }

  /**
   * This is called when the user wants to create a new template from scratch. 
   * @param dto DiseaseGeneDto information about the disease (label/id) and the gene (symbol/HGNC/transcript)
   * @param input Seed text from which we generate initial HPO columns
   * @returns 
   */
  async createNewTemplateFromSeeds(dto: DiseaseData, cohortType: CohortType, input: string):  Promise<CohortData> {
    console.log("getNewTemplateFromSeeds in service", dto, input);
    return await invoke<CohortData>("create_template_dto_from_seeds", {
      'dto': dto,
      'cohortType': cohortType,
      'input': input,
    });
  }
  

  /** Load the version-one format Excel template (all of which are Mendelian) */
  async loadPtExcelTemplate(updateLabels: boolean): Promise<CohortData> {
    return await invoke<CohortData>("load_phetools_excel_template", { "updateLabels": updateLabels});
  }

  async loadPtJson(): Promise<CohortData> {
    return await invoke<CohortData>("load_ptools_json");
  }

  /** Load an excel template file and try to fix some common errors (outdated HPO labels, whitespace) */
  async loadAndFixPtTemplate(): Promise<CohortData> {
    return await invoke<CohortData>("load_phetools_template", { "fixErrors": true});
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

  async validateHgvs(dto: VariantDto, cohort_dto: CohortData): Promise<HgvsVariant> {
    return invoke<HgvsVariant>('validate_hgvs_variant', {dto: dto, cohortDto: cohort_dto})
  }

  async validateSv(dto: VariantDto, cohort_dto: CohortData): Promise<StructuralVariant> {
    return invoke<StructuralVariant>('validate_structural_variant', {dto: dto, cohortDto: cohort_dto})
  }
  

   async saveCohort(cohort_dto: CohortData): Promise<void> {
    return invoke<void>('save_template', {cohortDto: cohort_dto});
  }

  async validateCohort(cohort_dto: CohortData): Promise<void> {
    return invoke<void>('validate_template', {cohortDto: cohort_dto});
  }

  async exportPpkt(cohort_dto: CohortData): Promise<string> {
    return invoke<string>('export_ppkt', {cohortDto: cohort_dto});
  }

   async exportHpoa(cohort_dto: CohortData): Promise<string> {
    return invoke<string>('export_hpoa', {cohortDto: cohort_dto});
  }

  /**
   * Add an HPO term to the current cohort. The column should show "na" for all phenopackets.
   * This enables us to add an HPO term and then edit it in the GUI.
   * @param id - The HPO term ID (e.g., "HP:0004322")
   * @param label - The human-readable label (e.g., "Seizures")
   */
  async addHpoToCohort(id: string, label: string, cohortDto: CohortData): Promise<CohortData> {
    return invoke<CohortData>('add_hpo_term_to_cohort', 
        {hpoId: id, hpoLabel: label, cohortDto: cohortDto});
  }


  async addNewRowToCohort(
      individualDto: IndividualData, 
      hpoAnnotations: HpoTermData[],
      variantKeyList: string[],
      cohortDto: CohortData): Promise<CohortData> {
    return invoke<CohortData>('add_new_row_to_cohort', 
      { individualDto, 
         hpoAnnotations,
         variantKeyList,
         cohortDto
      });
  }

  

  /**
   * Validate variants in the back end and return the results for display.
   * @param variantList: Variants derived from the template in the frontend
   * @returns List of the same variants, with the validated flag set to true if validations was 
   */
  async validateVariantDtoList(variantList: VariantDto[]): Promise<VariantDto[]> {
    return invoke<VariantDto[]>('validate_variant_list_dto', {
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


  /**
   * When we start to extract the excel file, we get only the raw table (list of EtlColumnDto objects).
   * We additionally need the user to enter information (DiseaseData, pmid, title) that we need to be able to 
   * store the JSON format (or to convert to our internal template representation) 
   * @param template: list of columns from the external table
   */
  async saveJsonExternalTemplate(template: EtlDto) {
      console.log('Template data being sent2:', JSON.stringify(template, null, 2));
    await invoke('save_external_template_json', {  template });
  }

  async loadJsonExternalTemplate(): Promise<EtlDto> {
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
  async getVariantAnalysis(cohort: CohortData): Promise<VariantDto[]> {
    return await invoke<VariantDto[]>('get_variant_analysis', {
      cohortDto: cohort
    });
  }

  /** Map a list of column entries to a list of unique HpoTerm Duplet objects.  */
  async mapColumnToHpo(colValues: string[]): Promise<TextAnnotationDto[]> {
    const uniqueItems = Array.from(new Set(colValues));
    const alphaOnly = uniqueItems.filter(item => /[a-zA-Z]/.test(item)); // remove entries such as "-"
    const result = alphaOnly.join(' . ');
    return await invoke<TextAnnotationDto[]>('map_text_to_annotations', {inputText: result});
  }


}
