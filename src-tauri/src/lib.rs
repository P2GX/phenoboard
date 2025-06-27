mod directory_manager;
mod dto;
mod phenoboard;
mod hpo;
mod settings;
mod table_manager;
mod util;

use ga4ghphetools::dto::template_dto::TemplateDto;
use phenoboard::PhenoboardSingleton;
use rfd::FileDialog;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_dialog::DialogExt;
use std::{collections::HashMap, sync::{Arc, Mutex}};
use tauri_plugin_fs::{init};

use crate::{dto::{pmid_dto::PmidDto, status_dto::StatusDto, text_annotation_dto::{ParentChildDto, TextAnnotationDto}}, hpo::ontology_loader};

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
            get_phetools_table,
            get_phetools_template,
            get_template_summary,
            highlight_text_with_hits,
            hpo_can_be_updated,
            get_backend_status,
            load_phetools_template,
            load_hpo,
            run_text_mining,
            map_text_to_annotations,
            set_value,
            table_manager::edit_current_column,
            table_manager::get_phetools_column,
            table_manager::get_selected_phetools_column,
            table_manager::process_pyphetools_table_rclick,
            get_table_columns_from_seeds,
            get_hp_json_path,
            get_pt_template_path,
            select_phetools_template_path,
            fetch_pmid_title,
            get_hpo_parent_and_children_terms,
            get_hpo_autocomplete_terms,
            submit_autocompleted_hpo_term
        ])
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


#[tauri::command]
async fn load_phetools_template(
    app: AppHandle,
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
) -> Result<(), String> {
    let phenoboard_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    println!("load_phetools_template");
    std::thread::spawn(move || {
        match app.dialog().file().blocking_pick_file() {
            Some(file) => {
                let mut singleton = phenoboard_arc.lock().unwrap();
                let path_str = file.to_string();
                println!("load_phetools_template got string: {}", &path_str);
                match singleton.load_excel_template(&path_str) {
                    Ok(_) => {
                        let status = singleton.get_status();
                        println!("load pt template: {:?}",&status);
                        let _ = app.emit("backend_status", &status);
                    },
                    Err(e) => {
                        let mut status = singleton.get_status();
                        status.has_error = true;
                        status.error_message = format!("{}", e);
                        let _ = app.emit("backend_status", &status);
                    },
                };
            },
            None => {
                let _ = app.emit("templateLoaded", "failure");
            }
        }
    });
    Ok(())
}




#[tauri::command]
fn run_text_mining(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    input_text: &str
) -> String {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    let json = singleton.map_text(input_text);
    json
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
fn highlight_text_with_hits(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    input_text: &str) 
    -> Result<String, String> 
{
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    let sorted_hits = singleton.get_sorted_fenominal_hits(input_text)?;
    let mut html = String::new();
    html.push_str("<div class=\"hpominingbox\">");
    let mut last_index = 0;

    for hit in sorted_hits {
        html.push_str(&html_escape::encode_text(&input_text[last_index..hit.span.start]));
        let matched_text = &input_text[hit.span.clone()];
        let class = if hit.is_observed { "observed" } else { "excluded" };
        let annotated = format!(
            r#"<span class="hpo-hit {}" title="{} [{}]" data-id="{}">{}</span>"#,
            class,
            hit.label,
            hit.term_id,
            hit.term_id,
            html_escape::encode_text(matched_text),
        );
        html.push_str(&annotated);

        last_index = hit.span.end;
    }
    // Add any remaining text after last hit
    html.push_str(&html_escape::encode_text(&input_text[last_index..]));
    html.push_str("</div>"); // close div for hpominingbox
    println!("\n\n \n\n{}\n\n\n\n", &html);
    Ok(html)
}


/// When we initialize a new Table (Excel file) for curation, we start with
/// a text that contains candidate HPO terms for curation.
/// This function performs text mining on that text and creates
/// a Matrix of Strings with which we initialize the table in the GUI
/// TODO: better documentation
#[tauri::command]
fn get_phetools_table(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
) -> Result<Vec<Vec<String>>, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    return singleton.get_matrix();
}


#[tauri::command]
fn get_phetools_template(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
) -> Result<TemplateDto, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    return singleton.get_phetools_template();
}



#[tauri::command]
fn set_value(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    r: usize,
    c: usize,
    value: &str,
) -> Result<(), String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.set_value(r, c, value)?;
    Ok(())
}


#[tauri::command]
fn get_template_summary(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) -> Result<HashMap<String,String>, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.get_template_summary()
}

#[tauri::command]
fn get_hpo_data(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) ->Result<HashMap<String,String>, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    singleton.get_hpo_data()
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




#[tauri::command]
fn select_phetools_template_path(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) -> Result<String, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    // synchronous (blocking) file chooser
    let result = FileDialog::new()
        .add_filter("Phetools template file", &["xlsx"])
        // .set_directory("/")
        .pick_file();
    match result {
        Some(file) => {
            let pbresult = file.canonicalize();
            match pbresult {
                Ok(abspath) => {
                    let pt_path = abspath.canonicalize().unwrap().display().to_string();
                    singleton.set_pt_template_path(&pt_path)?;
                    return Ok(pt_path);
                }
                Err(e) => Err(format!("Could not get path: {:?}", e)),
            }
        }
        None => Err(format!("Could not get path from file dialog")),
    }
}


/// When we initialize a new Table (Excel file) for curation, we start with
/// a text that contains candidate HPO terms for curation.
/// This function performs text mining on that text and creates
/// a Matrix of Strings with which we initialize the table in the GUI
/// TODO: better documentation

#[tauri::command]
fn get_table_columns_from_seeds(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    disease_id: &str,
    disease_name: &str,
    hgnc_id: &str,
    gene_symbol: &str,
    transcript_id: &str,
    input_text: &str,
) -> Result<String, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    singleton.get_table_columns_from_seeds(
        disease_id, disease_name, hgnc_id, gene_symbol, transcript_id, input_text)
}

/// TODO- this should be replaced by emitting signal after HPO is initialized
#[tauri::command]
fn get_backend_status(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>
) -> Result<StatusDto, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let singleton = singleton_arc.lock().unwrap();
    Ok(singleton.get_status())
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
fn submit_hgvs(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    app: AppHandle,
    transcript: &str,
    hgvs: &str,
) -> Result<(), String> {
        let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
        let singleton = singleton_arc.lock().unwrap();
        //let _ = app.emit("autocompletion", dto);
        Ok(())
    }

