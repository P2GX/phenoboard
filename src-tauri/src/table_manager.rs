use std::sync::{Arc, Mutex};

use tauri::State;

use crate::phenoboard::PhenoboardSingleton;




#[tauri::command]
pub fn get_phetools_column(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    col: usize,
) -> Result<Vec<Vec<String>>, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    let mat = singleton.get_column_with_context(col)?;
    singleton.set_current_column(col);
    return Ok(mat);
}

#[tauri::command]
pub fn get_selected_phetools_column(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
) -> Result<Vec<Vec<String>>, String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    match singleton.get_current_column() {
        Some(col) => {
            let mat = singleton.get_column_with_context(col)?;
            return Ok(mat);
        },
        None => {
            return Err(format!("No column selected"));
        }
    }
}


