use std::sync::Mutex;

use tauri::State;

use crate::hpo_curator::HpoCuratorSingleton;




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
    singleton: State<Mutex<HpoCuratorSingleton>>,
    value: String,
    row: usize,
    col: usize
) -> Result<(), String> {
    let mut singleton = singleton.lock().unwrap();
    println!("Received parameter: {} row {} col {}", value, row, col);
    match singleton.edit_table() {
        Some(table) => {
            table.set_value(row, col, value)
        },
        None => { return Err(format!("Could not retrieve edit table")); }
    }
}


#[tauri::command]
pub fn process_pyphetools_table_rclick(
    singleton: State<Mutex<HpoCuratorSingleton>>,
    value: String,
    row: usize,
    col: usize
) -> Result<(), String> {
    let mut singleton = singleton.lock().unwrap();
    println!("Received parameter: {} row {} col {}", value, row, col);
    match singleton.edit_table() {
        Some(table) => {
            table.set_current_column(col);
            table.set_current_row(row);
            table.set_current_operation(value);
        },
        None => { return Err(format!("Could not retrieve edit table")); }
    }
}