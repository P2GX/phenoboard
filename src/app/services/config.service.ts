import { Injectable } from '@angular/core';
import { invoke } from "@tauri-apps/api/core";
import { StatusDto } from '../models/status_dto';
import { PmidDto } from '../models/pmid_dto';
import { HpoAnnotationDto, ParentChildDto, TextAnnotationDto } from '../models/text_annotation_dto';
import { IndividualData, CohortData, DiseaseData, CohortType, HpoGroupMap } from '../models/cohort_dto';
import { HpoTermData } from '../models/hpo_term_dto';
import { HgvsVariant, IntergenicHgvsVariant, StructuralVariant, VariantDto } from '../models/variant_dto';
import { ColumnTableDto, EtlDto } from '../models/etl_dto';
import { RepoQc } from '../models/repo_qc';
import { HpoMatch, MinedCell, MiningConcept } from '../models/hpo_mapping_result';


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
  async createNewTemplate(dto: DiseaseData, cohortType: CohortType, acronym: string):  Promise<CohortData> {
    console.log("service, createNewTemplate", cohortType);
    return await invoke<CohortData>("create_new_cohort_data", {
      'dto': dto,
      'cohortType': cohortType,
      'acronym': acronym
    });
  }

  async createNewMeldedTemplate(diseaseA: DiseaseData, diseaseB: DiseaseData, acronym: string): Promise<CohortData> {
    const diseaseList = [diseaseA, diseaseB];
    return await invoke<CohortData>("create_new_melded_cohort",
      { 'diseases': diseaseList, 'acronym': acronym}
    )
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

    /** Load an excel template file and try to fix some common errors (outdated HPO labels, whitespace) */
  async resetPtTemplate(): Promise<void> {
    return await invoke<void>("reset_pt_template_path");
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

  async getHpoParentAndChildTerms(annotation: HpoAnnotationDto): Promise<ParentChildDto> {
  return await invoke("get_hpo_parent_and_children_terms", {annotation: annotation});
}


  async getAutocompleteHpo(value: string): Promise<HpoMatch[]> {
    return invoke<HpoMatch[]>('get_hpo_autocomplete', { query: value });
  }

  async getBestHpoMatch(value: string): Promise<HpoMatch> {
    return invoke<HpoMatch>('get_best_hpo_match', {query: value});
  }

  async submitAutocompleteHpoTerm(term_id: string, term_label:string): Promise<void> {
    return invoke<void>('submit_autocompleted_hpo_term', { termId: term_id, termLabel: term_label });
  }

  /*
  async validateHgvs(dto: VariantDto, cohort_dto: CohortData): Promise<HgvsVariant> {
    return invoke<HgvsVariant>('validate_hgvs_variant', {dto: dto, cohortDto: cohort_dto})
  }
*/
  async validateSv(dto: VariantDto): Promise<StructuralVariant> {
    return invoke<StructuralVariant>('validate_structural_variant',
      {variantDto: dto});
  }

  async validateHgvsVariant(symbol: string, hgnc: string, transcript: string, allele: string): Promise<HgvsVariant> {
    return invoke<HgvsVariant>('validate_hgvs_variant',
      {symbol: symbol, 
        hgnc: hgnc,
        transcript: transcript,
        allele: allele});
  }

  async validateIntergenic(symbol: string, hgnc: string, allele: string): Promise<IntergenicHgvsVariant> {
    return invoke<IntergenicHgvsVariant>('validate_intergenic_variant',
      {symbol: symbol, 
        hgnc: hgnc,
        allele: allele});
  }


   async saveCohort(cohort_dto: CohortData): Promise<void> {
    return invoke<void>('save_cohort_data', {cohortDto: cohort_dto});
  }

  async validateCohort(cohort_dto: CohortData): Promise<void> {
    return invoke<void>('validate_template', {cohortDto: cohort_dto});
  }

  /** Remove redundancies and conflicts (e.g., term is observed and ancestor of the term is excluded) */
  async sanitizeCohort(cohort_data: CohortData): Promise<CohortData> {
    return invoke<CohortData>('sanitize_cohort_data',  {cohortDto: cohort_data});
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
      individualData: IndividualData, 
      hpoAnnotations: HpoTermData[],
      variantKeyList: string[],
      cohortData: CohortData): Promise<CohortData> {
    return invoke<CohortData>('add_new_row_to_cohort', 
      {      
         individualData, 
         hpoAnnotations,
         variantKeyList,
         cohortData
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
    await invoke('save_external_template_json', {  template });
  }

  async loadJsonExternalTemplate(): Promise<EtlDto> {
    return await invoke('load_external_template_json');
  }

  async getCurrentOrcid(): Promise<string> {
    return await invoke<string>('get_biocurator_orcid');
  }

  async saveCurrentOrcid(orcid: string): Promise<StatusDto> {
    return await invoke<StatusDto>('save_biocurator_orcid',{
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

  /* Here, we map each individual string to a MiningConcept. */
  async mapColumnToMiningConcepts(cellValues: string[]): Promise<MiningConcept[]> {
    const uniqueFragments = Array.from(new Set(
      cellValues.flatMap(val => val.split(/[;\n]/).map(f => f.trim()).filter(f => f.length > 0))
    ));
    return await invoke<MiningConcept[]>('mine_multi_hpo_column', { cellValues });
  }

  async create_canonical_dictionary(mining_results: MiningConcept[]): Promise<MiningConcept[]> {
    return await invoke<MiningConcept[]>("create_canonical_dictionary", {miningResults: mining_results});
  }

  async expandDictionaryToRows(confirmedDict: MiningConcept[], rawResults: MiningConcept[]): Promise<MiningConcept[]> {
   return await invoke<MiningConcept[]>('expand_dictionary_to_rows', {
        dictionary: confirmedDict,
        rawResults: rawResults
    });
  }

  async createCellMappings(
    miningResults: MiningConcept[],
    cellValues:string[],
  ): Promise<MinedCell[]> {
    return await invoke<MinedCell[]>('create_cell_mappings', 
      {miningResults: miningResults, cellValues: cellValues});
  }

  async getMultiHpoStrings(minedCells: MinedCell[]): Promise<string[]> {
    return await invoke<string[]>('get_multi_hpo_strings', { minedCells: minedCells});
  }
  

  async  transformToCohortData(etlDto: EtlDto): Promise<CohortData> {
    return await invoke<CohortData>('get_cohort_data_from_etl_dto', { dto: etlDto});
  }

  /**
   * We regard strings such as c.123A>G, n.123A>G or m.123A>G as candidate HGVS string (mRNA, non-coding RNA, mitochrondrial)
   * @param val A candidate HGVS string
   * @returns 
   */
  isValidHgvsStart(val: string | null | undefined): boolean {
    if (! val) { return false;}
    return val.startsWith("c.") || val.startsWith("n.") || val.startsWith("m.");
  }  

  async mergeCohortData(cohort_previous: CohortData, cohort_dto_new: CohortData) {
    return await invoke<CohortData>('merge_cohort_data_from_etl_dto', 
      { previous: cohort_previous, transformed: cohort_dto_new});
  }

  async getTopLevelHpoTerms(cohortDto: CohortData): Promise<HpoGroupMap> { 
      return await invoke<HpoGroupMap>('get_hpo_terms_by_toplevel', {
        cohort: cohortDto
      });
  }

   async saveHtmlReport(cohortDto: CohortData): Promise<void> { 
      return await invoke<void>('save_html_report', {
        cohort: cohortDto
      });
  }

  async processAlleleColumn(etl_dto: EtlDto, index: number): Promise<EtlDto> {
    return await invoke<EtlDto>('process_allele_column', {
      etl: etl_dto,
      col: index
    });
  }

  async fetchRepoQc(): Promise<RepoQc> {
    return await invoke<RepoQc>('fetch_repo_qc');
  }

  async sortCohortByrows(dto: CohortData) {
    return await invoke<CohortData>('sort_cohort_by_rows', {dto: dto});
  }

  async getAllCohortAgeStrings(dto: CohortData): Promise<string[]> {
     return await invoke<string[]>('get_all_cohort_age_strings', {dto: dto});
  }

  async fetchHgncData(symbol: string): Promise<{ hgncId: string, maneSelect: string}> {
    return await invoke<{ hgncId: string, maneSelect: string}>('fetch_hgnc_data', {symbol: symbol});
  }

/**
 * Adjusts x and y coordinates to ensure a menu stays within the viewport.
 */
  calculateMenuPosition(
    clickX: number, 
    clickY: number, 
    menuWidth: number = 200, 
    menuHeight: number = 250
  ): { x: number, y: number } {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // If x + menuWidth exceeds viewport, flip it to the left of the cursor
    const x = (clickX + menuWidth > windowWidth) 
      ? clickX - menuWidth 
      : clickX;

    // If y + menuHeight exceeds viewport, flip it above the cursor
    const y = (clickY + menuHeight > windowHeight) 
      ? clickY - menuHeight 
      : clickY;

    return { x, y };
  }
}
