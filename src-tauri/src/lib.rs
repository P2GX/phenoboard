mod directory_manager;
mod dto;
mod phenoboard;
mod hpo;
mod settings;
mod util;

use ga4ghphetools::{dto::{cohort_dto::{CohortData, CohortType, DiseaseData, IndividualData}, etl_dto::{ColumnTableDto, EtlDto}, hgvs_variant::HgvsVariant, hpo_term_dto::{HpoTermData, HpoTermDuplet}, structural_variant::StructuralVariant, variant_dto::VariantDto}, factory::excel, repo::repo_qc::RepoQc};
use ga4ghphetools::dto::intergenic_variant::IntergenicHgvsVariant;
use ontolius::ontology::MetadataAware;
use phenoboard::PhenoboardSingleton;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_dialog::{DialogExt};
use std::{collections::{HashMap, HashSet}, fs,  sync::{Arc, Mutex}};
use tauri_plugin_fs::{init};


use crate::{dto::{pmid_dto::PmidDto, status_dto::ProgressDto, text_annotation_dto::{HpoAnnotationDto, ParentChildDto, TextAnnotationDto}}, hpo::{MinedCell, MiningConcept, ontology_loader}, phenoboard::HpoMatch};

struct AppState {
    phenoboard: Mutex<PhenoboardSingleton>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = Arc::new(AppState {
        phenoboard: Mutex::new(PhenoboardSingleton::new()),
    });

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(init())     
        .invoke_handler(tauri::generate_handler![
            emit_backend_status,
            get_ppkt_store_json,
            hpo_can_be_updated,
            load_phetools_excel_template,
            load_ptools_json,
            load_hpo,
            map_text_to_annotations,
            create_new_cohort_data,
            create_new_melded_cohort,
            get_hp_json_path,
            get_pt_template_path,
            reset_pt_template_path,
            fetch_pmid_title,
            get_hpo_parent_and_children_terms,
            get_hpo_autocomplete,
            get_best_hpo_match,
            submit_autocompleted_hpo_term,
            validate_template,
            sanitize_cohort_data,
            save_cohort_data,
            sort_cohort_by_rows,
            export_hpoa,
            add_hpo_term_to_cohort,
            add_new_row_to_cohort,
            validate_hgvs_variant,
            validate_structural_variant,
            validate_intergenic_variant,
            export_ppkt,
            load_external_excel,
            load_external_template_json,
            save_external_template_json,
            get_biocurator_orcid,
            save_biocurator_orcid,
            process_allele_column,
            get_variant_analysis,
            get_cohort_data_from_etl_dto,
            merge_cohort_data_from_etl_dto,
            get_hpo_terms_by_toplevel,
            save_html_report,
            fetch_repo_qc,
            mine_multi_hpo_column,
            create_canonical_dictionary,
            expand_dictionary_to_rows,
            create_cell_mappings,
            get_multi_hpo_strings
        ])
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            win.on_window_event(move |event| {
                if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                    //app_handle.exit(0);
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    std::process::exit(0);
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Prevent the default close behavior
                api.prevent_close();
                // TODO -- CHECK IF THERE IS UNSAVE WORK ETC.
                // Then close the window manually
                window.close().unwrap_or_default();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


/// Converts a `tauri_plugin_fs::FilePath` into a `String` representing the full path.
///
/// # Arguments
///
/// * `file_path` - The `FilePath` object returned by Tauri's file picker.
///
/// # Returns
///
/// * `Ok(String)` - The full path as a UTF-8 string (lossily converted if necessary).
/// * `Err(String)` - An error message if the path is missing.
///
/// # Example
///
/// ```rust
/// let full_path = get_hpo_json_full_path_as_str(file_path)?;
/// println!("Selected file path: {}", full_path);
/// ```
fn get_hpo_json_full_path_as_str(file_path: tauri_plugin_fs::FilePath) -> Result<String, String> {
    let path = file_path
        .as_path()
        .ok_or_else(|| "Failed to get path from FilePath".to_string())?;

    Ok(path.to_string_lossy().to_string())
}


/// Load the HPO from hp.json
#[tauri::command]
async fn load_hpo(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), String> {
    // 1. Clone the state reference for the thread
    let state_handle = state.inner().clone(); 
    let app_handle = app.clone();

    let _ = app.emit("hpoLoading", "loading");

    // 2. Use tauri::async_runtime to keep things integrated
   tauri::async_runtime::spawn(async move {
        // Now 'state_handle' is a 'static Arc, so the compiler is happy!
        let file_path = app_handle.dialog().file().blocking_pick_file();
        
        if let Some(file) = file_path {
            if let Ok(hp_json_path) = get_hpo_json_full_path_as_str(file) {
                // ... heavy loading logic ...
                match ontology_loader::load_ontology(&hp_json_path) {
                    Ok(ontology) => {
                        let mut singleton = state_handle.phenoboard.lock().unwrap();
                        singleton.set_hpo(Arc::new(ontology), &hp_json_path);
                        singleton.initialize_hpo_autocomplete();
                        
                        let _ = app_handle.emit("backend_status", singleton.get_status());
                    },
                    Err(e) => { /* emit failure */ }
                }
            }
        }
    });
    Ok(())
}


/// Allow the user to choose an existing PheTools template file from the file system and load it
#[tauri::command]
async fn load_phetools_excel_template(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
    update_labels: bool
) -> Result<CohortData, String> {
    //let phenoboard_arc: Arc::clone(&*singleton);
    let state_handle = state.inner().clone(); 
    let app_handle = app.clone();
    
    tokio::task::spawn_blocking(move || {
        match app_handle.dialog().file().blocking_pick_file() {
            Some(file) => {
                let mut singleton = state_handle.phenoboard.lock().unwrap();
                let path_str = file.to_string();
                match singleton.load_excel_template(&path_str, update_labels,|p, q|{
                    let _ = app_handle.emit("progress", ProgressDto::new(p, q));
                }) {
                    Ok(dto) => {
                        let status = singleton.get_status();
                        let _ = app_handle.emit("backend_status", &status);
                        Ok(dto)
                    },
                    Err(e) => {
                        let mut status = singleton.get_status();
                        status.has_error = true;
                        status.error_message = format!("{:?}", e);
                        let _ = app_handle.emit("backend_status", &status);
                        Err(e)
                    },
                }
            },
            None => {
                let _ = app_handle.emit("templateLoaded", "failure");
                Err("User cancelled file selection".to_string())
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}


/// Allow the user to choose an existing PheTools JOSN file from the file system and load it
#[tauri::command]
async fn load_ptools_json(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<CohortData, String> {
    //let phenoboard_arc: Arc::clone(&*singleton);
    let state_handle = state.inner().clone(); 
    let app_handle = app.clone();
    
    tokio::task::spawn_blocking(move || {
        match app_handle.dialog().file().blocking_pick_file() {
            Some(file) => {
                let mut singleton = state_handle.phenoboard.lock().unwrap();
                let path_str = file.to_string();
                match singleton.load_ptools_json(&path_str) {
                    Ok(dto) => {
                        let status = singleton.get_status();
                        let _ = app_handle.emit("backend_status", &status);
                        Ok(dto)
                    },
                    Err(e) => {
                        let mut status = singleton.get_status();
                        status.has_error = true;
                        status.error_message = format!("{:?}", e);
                        let _ = app_handle.emit("backend_status", &status);
                        Err(e)
                    },
                }
            },
            None => {
                let _ = app_handle.emit("templateLoaded", "failure");
                Err("User cancelled file selection".to_string())
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}





#[tauri::command]
fn map_text_to_annotations(
    state: tauri::State<'_, Arc<AppState>>,
    input_text: &str 
) -> Result<Vec<TextAnnotationDto>, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    return singleton.map_text_to_annotations(input_text);
}



/// Check whether the HPO version we are using is the latest version
/// by comparing the latest version online
#[tauri::command]
fn hpo_can_be_updated(
    state: tauri::State<'_, Arc<AppState>>,
) ->Result<bool, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.hpo_can_be_updated()
}

/// Get a JSON object that represents the directory and file structure of the Phenopacket Store
#[tauri::command]
fn get_ppkt_store_json(
    state: tauri::State<'_, Arc<AppState>>,
) ->  Result<serde_json::Value, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.get_ppkt_store_json()
}


#[tauri::command]
fn emit_backend_status(
    app: AppHandle,
     state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    let status = singleton.get_status();
    let _ = app.emit("backend_status", &status);
    Ok(())
}



#[tauri::command]
fn get_hp_json_path(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<String, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.hp_json_path()
}

#[tauri::command]
fn get_pt_template_path(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<String, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.pt_template_path()
}

/// TODO - obsolete this once we have finished all legacy Excel templates.
#[tauri::command]
fn reset_pt_template_path(
    state: tauri::State<'_, Arc<AppState>>,
)  {
    let mut singleton =  match state.phenoboard.lock() {
        Ok(s) => s,
        Err(_) => { return; },
    };
    singleton.reset_pt_template_path();
}


/// When we initialize a new CohortData for curation, we start with
/// a text that contains candidate HPO terms for curation.
/// This function performs text mining on that text and creates
/// the initial Template DTO we use to add patient data to
#[tauri::command]
fn create_new_cohort_data(
    state: tauri::State<'_, Arc<AppState>>,
    dto: DiseaseData,
    cohort_type: CohortType,
    acronym: String
) -> Result<CohortData, String> {
    let mut singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.create_new_cohort_data(dto, cohort_type, acronym)
}

#[tauri::command]
fn create_new_melded_cohort(
    state: tauri::State<'_, Arc<AppState>>,
    diseases: Vec<DiseaseData>,
    acronym: String
) -> Result<CohortData, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    let hpo_version = match singleton.get_hpo() {
        Some(hpo) => hpo.version().to_string(),
        None => { return  Err("HPO not initialized".to_string());}
    };
    Ok(ga4ghphetools::factory::create_new_melded_cohort(diseases, acronym, &hpo_version))
}


#[tauri::command]
async fn fetch_pmid_title(
    input: &str
) -> Result<PmidDto, String> {
    PhenoboardSingleton::get_pmid_dto(input).await
}


#[tauri::command]
fn get_hpo_parent_and_children_terms(
    state: tauri::State<'_, Arc<AppState>>,
    annotation: HpoAnnotationDto
) -> Result<ParentChildDto, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    let annots = singleton.get_hpo_parent_and_children_terms(annotation);
    Ok(annots)
}



/// This function supplies the autocompletion candidates for angular for the HPO
/// The JavaScript ensures that query is at least 3 letters
#[tauri::command]
fn get_hpo_autocomplete(
    state: tauri::State<'_, Arc<AppState>>,
    query: String
) -> Vec<HpoMatch> {
    let singleton = match state.phenoboard.lock() {
        Ok(s) => s,
        Err(_) => return vec![],
    };

    // If query is too short, don't even bother searching
    if query.len() < 3 {
        return vec![];
    }
    singleton.search_hpo(&query, 20)
}

/// This function supplies the autocompletion candidates for angular for the HPO
/// The JavaScript ensures that query is at least 3 letters
#[tauri::command]
fn get_best_hpo_match(
    state: tauri::State<'_, Arc<AppState>>,
    query: String) -> Option<HpoMatch> {
        match state.phenoboard.lock() {
            Ok(singleton ) => singleton.get_best_hpo_match(query),
            Err(_) => None,
        }  
}




#[tauri::command]
fn submit_autocompleted_hpo_term(
    state: tauri::State<'_, Arc<AppState>>,
    app: AppHandle,
    term_id: &str,
    term_label: &str,
) -> Result<(), String> {
        let singleton = state.phenoboard.lock()
            .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
        let dto = singleton.get_autocompleted_term_dto(term_id, term_label)?;
        let _ = app.emit("autocompletion", dto);
        Ok(())
    }




#[tauri::command]
fn validate_template(
     state: tauri::State<'_, Arc<AppState>>,
    cohort_dto: CohortData) -> Result<(), String> {
   let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    let hpo = match singleton.get_hpo() {
        Some(hpo) => hpo.clone(),
        None => {
            return Err("Could not create CohortData because HPO was not initialized".to_string());
        },
    };
    ga4ghphetools::factory::qc_assessment(hpo.clone(), &cohort_dto)
}

#[tauri::command]
fn sanitize_cohort_data(
    state: tauri::State<'_, Arc<AppState>>,
    cohort_dto: CohortData) -> Result<CohortData, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    let hpo = match singleton.get_hpo() {
        Some(hpo) => hpo.clone(),
        None => {
            return Err("HPO not initialized".to_string());
        },
    };
    ga4ghphetools::factory::sanitize_cohort_data(hpo.clone(), &cohort_dto)
}



#[tauri::command]
fn save_cohort_data(
    state: tauri::State<'_, Arc<AppState>>,
    cohort_dto: CohortData) 
-> Result<(), String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.save_template_json(cohort_dto)
}

#[tauri::command]
fn sort_cohort_by_rows(dto: CohortData) 
-> CohortData {
    ga4ghphetools::factory::sort_rows(&dto)
}


#[tauri::command]
fn export_ppkt(
    state: tauri::State<'_, Arc<AppState>>,
    cohort_dto: CohortData) -> Result<String, String> {
    let mut singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.export_ppkt(cohort_dto)
}

#[tauri::command]
fn export_hpoa(
    state: tauri::State<'_, Arc<AppState>>,
    cohort_dto: CohortData) -> Result<String, String> {
    let mut singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.export_hpoa(cohort_dto)
}



#[tauri::command]
fn add_hpo_term_to_cohort(
    state: tauri::State<'_, Arc<AppState>>,
    hpo_id: &str,
    hpo_label: &str,
    cohort_dto: CohortData) 
-> Result<CohortData, String> {
   let mut singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.add_hpo_term_to_cohort(hpo_id, hpo_label, cohort_dto)
}



#[tauri::command]
fn add_new_row_to_cohort(
    state: tauri::State<'_, Arc<AppState>>,
    individual_data: IndividualData, 
    hpo_annotations: Vec<HpoTermData>,
    variant_key_list: Vec<String>,
    cohort_data: CohortData) 
-> Result<CohortData, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    let hpo = match singleton.get_hpo(){
        Some(ontology) => ontology.clone(),
        None => { return Err("HPO not initialized".to_string()); },
    };
    ga4ghphetools::factory::add_new_row_to_cohort(hpo, individual_data, hpo_annotations, variant_key_list, cohort_data)
}


#[tauri::command]
fn validate_hgvs_variant(
    symbol: &str,
    hgnc: &str,
    transcript: &str,
    allele: &str) 
-> Result<HgvsVariant, String> {
    ga4ghphetools::variant::validate_hgvs_variant(symbol, hgnc, transcript, allele)
}

#[tauri::command]
fn validate_structural_variant(
    variant_dto: VariantDto) 
-> Result<StructuralVariant, String> {
    ga4ghphetools::variant::validate_structural_variant(variant_dto)
}

#[tauri::command]
fn validate_intergenic_variant(
    symbol: String, 
    hgnc: String, 
    allele: String)
-> Result<IntergenicHgvsVariant, String> {
    let vsto = VariantDto::hgvs_g(&allele,  &hgnc,  &symbol); 
    ga4ghphetools::variant::validate_intergenic_variant(vsto)
  }


/// Allow the user to choose an external Excel file (e.g., supplemental table) from which we will create phenopackets
#[tauri::command]
async fn load_external_excel(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
    row_based:bool
) -> Result<ColumnTableDto, String> {
    //let phenoboard_arc: Arc::clone(&*singleton);
    let state_handle = state.inner().clone();
    let app_handle = app.clone();
    
    tokio::task::spawn_blocking(move || {
        match app_handle.dialog().file().blocking_pick_file() {
            Some(file) => {
                let singleton = state_handle.phenoboard.lock().unwrap();
                let path_str = file.to_string();
                match excel::read_external_excel_to_dto(&path_str, row_based) {
                    Ok(dto) => {
                        let status = singleton.get_status();
                        let _ = app_handle.emit("backend_status", &status);
                        Ok(dto)
                    },
                    Err(e) => {
                        let mut status = singleton.get_status();
                        status.has_error = true;
                        status.error_message = format!("{:?}", e);
                        let _ = app_handle.emit("backend_status", &status);
                        Err(e)
                    },
                }
            },
            None => {
                let _ = app_handle.emit("templateLoaded", "failure");
                Err("User cancelled file selection".to_string())
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// The external template JSON is an intermediate file representing our work on 
/// an external table (e.g., supplemental material) that we save as a JSON to complete
/// later on. This command opens a file chooser.
#[tauri::command]
async fn save_external_template_json(
    app: AppHandle,
    template: EtlDto
) -> Result<(), String> {
    let app_handle = app.clone();
    //println!("save_external_template_json -- {:?}", template);
    tokio::task::spawn_blocking(move || {
        if let Some(file) = app_handle.dialog().file()
            .add_filter("JSON files", &["json"])
            .set_file_name("external_template.json")
            .blocking_save_file() {
            if let Some(path_ref) = file.as_path() {
                let mut path = path_ref.to_path_buf();
                // make sure there is a *.json extension
                if path.extension().map_or(true, |ext| ext != "json") {
                    path.set_extension("json");
                }
                let json = serde_json::to_string_pretty(&template)
                    .map_err(|e| format!("Failed to serialize template: {}", e))?;
                fs::write(&path, json)
                    .map_err(|e| format!("Failed to write file: {}", e))?;
                Ok(())
            } else {
                let _ = app_handle.emit("templateLoaded", "failure");
                Err("failed to extract path from FileDialogPath".to_string())
            }
        } else {
            let _ = app_handle.emit("templateLoaded", "failure");
            Err("User cancelled file selection".to_string())
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}



#[tauri::command]
async fn load_external_template_json(
    app: AppHandle,
) -> Result<EtlDto, String> {
    let app_handle = app.clone();
    tokio::task::spawn_blocking(move || {
        let fpath =  app_handle.dialog().file().blocking_pick_file();
        match fpath {
            Some(file_path) => {
                let path_str = file_path.to_string();
                let contents = fs::read_to_string(path_str)
                    .map_err(|e| format!("Failed to read file: {}", e))?;
                let dto: EtlDto = serde_json::from_str(&contents)
                    .map_err(|e| format!("Failed to deserialize JSON: {}", e))?;
                Ok(dto)
            }
            None => todo!(),
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}


#[tauri::command]
async fn get_biocurator_orcid(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<String, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.get_biocurator_orcid()
}

#[tauri::command]
async fn save_biocurator_orcid(
    state: tauri::State<'_, Arc<AppState>>,
    orcid: String
) -> Result<(), String> {
    let mut singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.save_biocurator_orcid(orcid)
}

#[tauri::command]
async fn get_variant_analysis(
    state: tauri::State<'_, Arc<AppState>>,
    cohort_dto: CohortData
) -> Result<Vec<VariantDto>, String> {
    let mut singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.get_variant_analysis(cohort_dto)
}

#[tauri::command]
fn process_allele_column(
    state: tauri::State<'_, Arc<AppState>>,
    etl: EtlDto,
    col: usize
) -> Result<EtlDto, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.process_allele_column(etl, col)
}

/// This command creates a CohortData object from the current EtlDto and should
/// be called after the user has finished transformation
#[tauri::command]
async  fn get_cohort_data_from_etl_dto(
    state: tauri::State<'_, Arc<AppState>>,
    dto: EtlDto,
) -> Result<CohortData, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    let hpo = match singleton.get_hpo() {
        Some(hpo) => hpo,
        None => {
            return Err("Could not create CohortData because HPO was not initialized".to_string());
        },
    };
    ga4ghphetools::etl::get_cohort_data_from_etl_dto(hpo, dto)
}


/// This command merges a CohortData object that was created f rom the current EtlDto (transformed)
/// and merges it with the previous CohortData (previous)
#[tauri::command]
async fn merge_cohort_data_from_etl_dto(
    state: tauri::State<'_, Arc<AppState>>,
    previous: CohortData,
    transformed: CohortData
) -> Result<CohortData, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    let hpo = match singleton.get_hpo() {
        Some(hpo) => hpo.clone(),
        None => {
            return Err("Could not create CohortData because HPO was not initialized".to_string());
        },
    };
    ga4ghphetools::factory::merge_cohort_data_from_etl_dto(previous, transformed, hpo)
}

#[tauri::command]
async fn get_hpo_terms_by_toplevel(
    state: tauri::State<'_, Arc<AppState>>,
    cohort: CohortData,
)-> Result<HashMap<String, Vec<HpoTermDuplet>>, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    let hpo = match singleton.get_hpo() {
        Some(hpo) => hpo.clone(),
        None => {
            return Err("Could not create CohortData because HPO was not initialized".to_string());
        },
    };
    ga4ghphetools::hpo::get_hpo_terms_by_toplevel(cohort, hpo)
}

/// Save a rendered HTML report for the given cohort data.
///
/// This command opens a file chooser dialog asking the user where to save
/// the rendered HTML report. It then generates the HTML via
/// [`export::html::render`] and writes it to disk.
///
/// # Arguments
/// * `app` — The Tauri app handle (used to open dialogs and emit events).
/// * `cohort` — The cohort data to render.
/// * `hpo_path` — Path to the serialized ontology file (used to reconstruct the ontology).
///
/// # Returns
/// * `Ok(())` on success.
/// * `Err(String)` if the rendering or saving fails.
///
/// # Notes
/// The operation runs in a blocking task using `tokio::task::spawn_blocking`
/// to prevent blocking the async runtime.
#[tauri::command]
async fn save_html_report(
    app: AppHandle,
     state: tauri::State<'_, Arc<AppState>>,
    cohort: CohortData,
) -> Result<(), String> {
    let app_handle = app.clone();
    let state_handle = state.inner().clone(); 
    let hpo = {
        let guard = state_handle.phenoboard.lock().unwrap();
        guard
            .get_hpo()
            .ok_or_else(|| "Could not create CohortData because HPO was not initialized".to_string())?
    };
    tokio::task::spawn_blocking(move || {
        // Ask user for save destination
        if let Some(file) = app_handle.dialog().file()
            .add_filter("HTML files", &["html"])
            .set_file_name("cohort_report.html")
            .blocking_save_file()
        {
            if let Some(path_ref) = file.as_path() {
                let mut path = path_ref.to_path_buf();
                // Ensure .html extension
                if path.extension().map_or(true, |ext| ext != "html") {
                    path.set_extension("html");
                }
                ga4ghphetools::export::render_html(cohort, hpo, &path)
                    .map_err(|e| format!("Failed to render HTML: {}", e))?;
                // Confirm success
                app_handle.emit("htmlReportSaved", "success").ok();
                Ok(())
            } else {
                app_handle.emit("htmlReportSaved", "failure").ok();
                Err("Failed to extract path from FileDialogPath".to_string())
            }
        } else {
            app_handle.emit("htmlReportSaved", "cancelled").ok();
            Err("User cancelled file selection".to_string())
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}



#[tauri::command]
fn fetch_repo_qc(state: tauri::State<'_, Arc<AppState>>)
 -> Result<RepoQc, String> {
    let singleton = state.phenoboard.lock()
        .map_err(|_| "Failed to acquire lock on HPO State".to_string())?;
    singleton.get_repo_qc()
}



/// get list of Mining concepts for each cell
#[tauri::command]
async fn mine_multi_hpo_column(
    state: tauri::State<'_, Arc<AppState>>,
    cell_values: Vec<String>
) -> Result<Vec<MiningConcept>, String> {
    let singleton = state.phenoboard.lock().map_err(|_| "Lock failed")?;
    let all_concepts: Vec<MiningConcept> = cell_values
        .into_iter()
        .enumerate()
        .flat_map(|(idx, text)| {
            singleton.get_mining_concepts(idx, &text)
        })
        .collect();
    Ok(all_concepts)
}

/// Get list of unique concepts (in which the row number is fake) for the 
/// first phase of text mining

#[tauri::command]
async fn create_canonical_dictionary(
    mining_results: Vec<MiningConcept>,
) -> Result<Vec<MiningConcept>, String> {
    let mut unique_map: HashMap<String, MiningConcept> = HashMap::new();

    for mut concept in mining_results {
        unique_map
            .entry(concept.original_text.clone())
            .and_modify(|existing| {
                // Merge row indices
                existing
                    .row_index_list
                    .extend(concept.row_index_list.drain(..));
            })
            .or_insert_with(|| {
                // First time we see this concept → becomes canonical
                concept
            });
    }

    // Optional but usually a good idea: deduplicate + sort row indices
    for concept in unique_map.values_mut() {
        concept.row_index_list.sort_unstable();
        concept.row_index_list.dedup();
    }

    // Convert back to Vec and sort by text for stability
    let mut result: Vec<MiningConcept> = unique_map.into_values().collect();
    result.sort_by(|a, b| a.original_text.cmp(&b.original_text));

    Ok(result)
}


/// Get list of unique concepts (in which the row number is fake) for the 
/// first phase of text mining

#[tauri::command]
async fn create_cell_mappings(
    mining_results: Vec<MiningConcept>,
    cell_values: Vec<String>,
) -> Result<Vec<MinedCell>, String> {
    crate::hpo::hpo_etl::create_cell_mappings(cell_values, mining_results)
}


#[tauri::command]
async fn get_multi_hpo_strings(mined_cells: Vec<MinedCell>) -> Result<Vec<String>, String> {
    crate::hpo::hpo_etl::get_multi_hpo_strings(mined_cells)
}
  



#[tauri::command]
async fn expand_dictionary_to_rows(
    dictionary: Vec<MiningConcept>,
    raw_results: Vec<MiningConcept>
) -> Result<Vec<MiningConcept>, String> {
    // 1. Create a lookup map from the confirmed dictionary
    let dict_map: std::collections::HashMap<String, MiningConcept> = dictionary
        .into_iter()
        .map(|c| (c.original_text.clone(), c))
        .collect();

    // 2. Map the raw results back to the confirmed versions while preserving row_index
    let expanded: Vec<MiningConcept> = raw_results
        .into_iter()
        .map(|mut raw| {
            if let Some(confirmed) = dict_map.get(&raw.original_text) {
                // Apply the user's choices from Phase 1 to this specific row
                raw.suggested_terms = confirmed.suggested_terms.clone();
                raw.mining_status = confirmed.mining_status.clone();
                // We do NOT overwrite row_index; we keep the raw one
            }
            raw
        })
        .collect();

    Ok(expanded)
}
