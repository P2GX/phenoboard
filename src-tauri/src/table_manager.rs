use std::sync::{Arc, Mutex};

use tauri::State;

use crate::phenoboard::PhenoboardSingleton;

/// Process a right click on the pyphetools menu
///
/// The user may choose to edit a row (individual) or column
/// (collection of data for an HPO term or other item). The app will then open another panel that
/// focuses on that row or column for editing.
/// # Arguments
///
/// * `cell_contents` - The text from a cell of the pyphetools draft tempalte
/// * `row` - The row of the pyphetools table
/// * `col` - The column of the pyphetools table
///
/// # Returns
///
/// A result. Ok(()) if the edit operation was successful, or an Err (string) otherwise.
#[tauri::command]
pub fn edit_pyphetools_table_cell(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    value: String,
    row: usize,
    col: usize,
) -> Result<(), String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    println!("Received parameter: {} row {} col {}", value, row, col);
    let _ = singleton.set_table_cell(row, col, &value);
    Ok(())
}

/// TODO What about values we do not want to process? Should these be errors or do we need a switch
/// for values such as "do something else"
#[tauri::command]
pub fn process_pyphetools_table_rclick(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    value: String,
    row: usize,
    col: usize,
) -> Result<(), String> {
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    println!("Received parameter: {} row {} col {}", value, row, col);
    let _ = singleton.set_table_cell(row, col, &value);
    Ok(())
}

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

#[tauri::command]
pub fn edit_current_column(
    singleton: State<'_, Arc<Mutex<PhenoboardSingleton>>>,
    value: &str,
    row: usize,
) -> Result<(), String> {
    println!(
        "table_manager::edit_current col, value={}, row={}",
        value, row
    );
    let singleton_arc: Arc<Mutex<PhenoboardSingleton>> = Arc::clone(&*singleton); 
    let mut singleton = singleton_arc.lock().unwrap();
    match singleton.get_current_column() {
        Some(col) => {
            println!("edit_current_column col={} value={}", col, value);
            let _ = singleton.set_value(row, col, value)?;
        }
        None => {
            return Err(format!("Current column not initialized"));
        }
    }
    return Ok(());
}
