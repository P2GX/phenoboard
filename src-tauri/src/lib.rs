mod directory_manager;
mod dto;
mod phenoboard;
mod hpo;
mod settings;
mod util;

use ga4ghphetools::dto::{etl_dto::ColumnTableDto, hpo_term_dto::HpoTermDto, template_dto::{DiseaseGeneDto, GeneVariantBundleDto, IndividualBundleDto, TemplateDto}, variant_dto::VariantDto};
use phenoboard::PhenoboardSingleton;
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_dialog::DialogExt;
use std::{fs, sync::{Arc, Mutex}};
use tauri_plugin_fs::{init};


use crate::{dto::{pmid_dto::PmidDto, text_annotation_dto::{ParentChildDto, TextAnnotationDto}}, hpo::ontology_loader};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(init())
    .manage(Arc::new(Mutex::new(PhenoboardSingleton::new())))
        
        .invoke_handler(tauri::generate_handler![
            emit_backend_status,
            get_ppkt_store_json,
            get_phetools_template,
            hpo_can_be_updated,
            load_phetools_excel_template,
            load_hpo,
            map_text_to_annotations,
            create_template_dto_from_seeds,
            get_hp_json_path,
            get_pt_template_path,
            fetch_pmid_title,
            get_hpo_parent_and_children_terms,
            get_hpo_autocomplete_terms,
            get_best_hpo_match,
            submit_autocompleted_hpo_term,
            validate_template,
            save_template,
            add_hpo_term_to_cohort,
            add_new_row_to_cohort,
            submit_variant_dto,
            validate_variant_list_dto,
            export_ppkt,
            load_external_excel,
            load_external_template_json,
            save_external_template_json,
            get_biocurator_orcid,
            save_biocurator_orcid,
        ])
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            let app_handle = app.app_handle().clone();
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



/// Load the HPO from hp.json
#[tauri::command]
fn load_hpo(
    app: AppHandle,
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
) -> Result<(), String> {
    let phenoboard_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let _ = app.emit("hpoLoading", "loading");
    std::thread::spawn(move || {
        let mut singleton = phenoboard_arc.lock().unwrap(); 
        match app.dialog().file().blocking_pick_file() {
            Some(file) => {
                let _ = app.emit("loadedHPO", "loading");
                match ontology_loader::load_ontology(file) {
                    Ok(ontology) => {
                        let hpo_arc = Arc::new(ontology);
                        singleton.set_hpo(hpo_arc);
                    },
                    Err(e) => {
                        let _ = app.emit("failure", format!("Failed to load HPO: {}", e));
                    }
                }
            },
            None => {
                let _ = app.emit("failure", "Failed to load HPO");
            }
        };
        let status = singleton.get_status();
        let _ = app.emit("backend_status", &status);
    });
    Ok(())
}


/// Allow the user to choose an existing PheTools template file from the file system and load it
#[tauri::command]
async fn load_phetools_excel_template(
    app: AppHandle,
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    fix_errors: bool
) -> Result<TemplateDto, Vec<String>> {
    //let phenoboard_arc: Arc::clone(&*singleton);
    let phenoboard_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let app_handle = app.clone();
    
    tokio::task::spawn_blocking(move || {
        match app_handle.dialog().file().blocking_pick_file() {
            Some(file) => {
                let mut singleton = phenoboard_arc.lock().unwrap();
                let path_str = file.to_string();
                match singleton.load_excel_template(&path_str, fix_errors) {
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
                Err(vec!["User cancelled file selection".to_string()])
            }
        }
    })
    .await
    .map_err(|e| vec![format!("Task join error: {}", e)])?
}


#[tauri::command]
fn map_text_to_annotations(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    input_text: &str 
) -> Result<Vec<TextAnnotationDto>, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    return singleton.map_text_to_annotations(input_text);
}





#[tauri::command]
fn get_phetools_template(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
) -> Result<TemplateDto, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    return singleton.get_phetools_template();
}


/// Check whether the HPO version we are using is the latest version
/// by comparing the latest version online
#[tauri::command]
fn hpo_can_be_updated(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) ->Result<bool, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.hpo_can_be_updated()
}

/// Get a JSON object that represents the directory and file structure of the Phenopacket Store
#[tauri::command]
fn get_ppkt_store_json(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) ->  Result<serde_json::Value, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.get_ppkt_store_json()
}


#[tauri::command]
fn emit_backend_status(
    app: AppHandle,
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) -> Result<(), String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    let status = singleton.get_status();
    let _ = app.emit("backend_status", &status);
    Ok(())
}



#[tauri::command]
fn get_hp_json_path(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) -> Result<String, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.hp_json_path()
}

#[tauri::command]
fn get_pt_template_path(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) -> Result<String, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.pt_template_path()
}


/// When we initialize a new Table (Excel file) for curation, we start with
/// a text that contains candidate HPO terms for curation.
/// This function performs text mining on that text and creates
/// the initial Template DTO we use to add patient data to
#[tauri::command]
fn create_template_dto_from_seeds(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    dto: DiseaseGeneDto,
    input: String
) -> Result<TemplateDto, String> {
     println!("{}:{} - input {}", file!(), line!(), input);
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.create_template_dto_from_seeds(dto, input)
}


#[tauri::command]
async fn fetch_pmid_title(
    input: &str
) -> Result<PmidDto, String> {
    PhenoboardSingleton::get_pmid_dto(input).await
}


#[tauri::command]
fn get_hpo_parent_and_children_terms(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    annotation: TextAnnotationDto
) -> Result<ParentChildDto, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    let annots = singleton.get_hpo_parent_and_children_terms(annotation);
    Ok(annots)
}



/// This function supplies the autocompletion candidates for angular for the HPO
/// The JavaScript ensures that query is at least 3 letters
#[tauri::command]
fn get_hpo_autocomplete_terms(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    query: String) -> Vec<String> {
        let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
        let singleton = singleton_arc.lock().unwrap();
        let terms = singleton.get_hpo_autocomplete();
        terms
            .into_iter()
            .filter(|t| t.to_lowercase().contains(&query.to_lowercase()))
            .cloned()
            .collect()
}

/// This function supplies the autocompletion candidates for angular for the HPO
/// The JavaScript ensures that query is at least 3 letters
#[tauri::command]
fn get_best_hpo_match(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    query: String) -> String {
        let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
        let singleton = singleton_arc.lock().unwrap();
        singleton.get_best_hpo_match(query)
}




#[tauri::command]
fn submit_autocompleted_hpo_term(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    app: AppHandle,
    term_id: &str,
    term_label: &str,
) -> Result<(), String> {
        let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
        let singleton = singleton_arc.lock().unwrap();
        let dto = singleton.get_autocompleted_term_dto(term_id, term_label)?;
        let _ = app.emit("autocompletion", dto);
        Ok(())
    }


#[tauri::command]
fn submit_variant_dto(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    variant_dto: VariantDto,
) -> Result<VariantDto, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.submit_variant_dto(variant_dto) 
}

#[tauri::command]
fn validate_template(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    cohort_dto: TemplateDto) -> Result<(), Vec<String>> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.validate_template(cohort_dto)
}

#[tauri::command]
fn save_template(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    cohort_dto: TemplateDto) -> Result<(), Vec<String>> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.save_template(&cohort_dto)
}

#[tauri::command]
fn export_ppkt(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    cohort_dto: TemplateDto) -> Result<(), String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.export_ppkt(cohort_dto)
}





#[tauri::command]
fn add_hpo_term_to_cohort(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    hpo_id: &str,
    hpo_label: &str,
    cohort_dto: TemplateDto) 
-> Result<TemplateDto, Vec<String>> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.add_hpo_term_to_cohort(hpo_id, hpo_label, cohort_dto)
}



#[tauri::command]
fn add_new_row_to_cohort(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    individual_dto: IndividualBundleDto, 
    hpo_annotations: Vec<HpoTermDto>,
    gene_variant_list: Vec<GeneVariantBundleDto>,
    template_dto: TemplateDto) 
-> Result<TemplateDto, Vec<String>> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    let updated_template = singleton.add_new_row_to_cohort(
        individual_dto, 
        hpo_annotations, 
        gene_variant_list,
        template_dto)?;
    println!("rust, add_new_row: {:?}", updated_template);
    Ok(updated_template)
}



#[tauri::command]
fn validate_variant_list_dto(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    variant_dto_list: Vec<VariantDto>) 
-> Result<Vec<VariantDto>, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.validate_variant_list_dto( variant_dto_list) 
}



/// Allow the user to choose an external Excel file (e.g., supplemental table) from which we will create phenopackets
#[tauri::command]
async fn load_external_excel(
    app: AppHandle,
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    row_based:bool
) -> Result<ColumnTableDto, String> {
    //let phenoboard_arc: Arc::clone(&*singleton);
    let phenoboard_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let app_handle = app.clone();
    
    tokio::task::spawn_blocking(move || {
        match app_handle.dialog().file().blocking_pick_file() {
            Some(file) => {
                let mut singleton = phenoboard_arc.lock().unwrap();
                let path_str = file.to_string();
                match singleton.load_external_excel(&path_str, row_based) {
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
    template: ColumnTableDto
) -> Result<(), String> {
    let app_handle = app.clone();
    tokio::task::spawn_blocking(move || {
        if let Some(file) = app_handle.dialog().file().blocking_save_file() {
            if let Some(path_ref) = file.as_path() {
                let mut path = path_ref.to_path_buf();
                if path.extension().is_none() {
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
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) -> Result<ColumnTableDto, String> {
    let phenoboard_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let app_handle = app.clone();

    tokio::task::spawn_blocking(move || {
        let fpath =  app_handle.dialog().file().blocking_pick_file();
        match fpath {
            Some(file_path) => {
                let mut singleton = phenoboard_arc.lock().unwrap();
                let path_str = file_path.to_string();
                let contents = fs::read_to_string(path_str)
                    .map_err(|e| format!("Failed to read file: {}", e))?;
                let dto: ColumnTableDto = serde_json::from_str(&contents)
                    .map_err(|e| format!("Failed to deserialize JSON: {}", e))?;
                singleton.set_external_template_dto(&dto);
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
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) -> Result<String, String> {
    let phenoboard_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = phenoboard_arc.lock().unwrap();
    singleton.get_biocurator_orcid()
}

#[tauri::command]
async fn save_biocurator_orcid(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    orcid: String
) -> Result<(), String> {
    let phenoboard_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = phenoboard_arc.lock().unwrap();
    singleton.save_biocurator_orcid(orcid)
}

 