//! A table to edit the PyPheTools matrix
//! 
//! We rely on the PheTools struct from the rphetools library to hold the current
//! validated template data. There are several operations that we perform on the template.
//! 
//! - add new empty row for editing. This requires the **PMID**, **title**, and **individual id**
//! - add an entry at cell (i,j). This operation returns a Result<Vec<String,String>,String>
//! - edit an entry at cell (i,j). This operation returns a Result<(),String>
//! - delete a row
//! 
//! Note that each row has the same Disease/Gene/Transcript and so when we add a new row, this information
//! is added automatically.

use rphetools::PheTools;

enum PptOperation {
    ShowColumn,
    ShowRow,
    EntireTable,
}

/// A table to edit our pyphetools matrix.
/// 
/// The table is a matrix of string entries that may be in an intermediate state
/// We will use rphetools to validate the table prior to saving to disk or exporting GA4GH Phenopackets.
pub struct PptEditTable<'a> {
    matrix: Vec<Vec<String>>,
    current_row: Option<usize>, 
    current_column: Option<usize>, 
    current_operation: PptOperation,
    ncols: usize,
    unsaved: bool,
    phetools: Option<PheTools<'a>>
}

impl<'a> PptEditTable<'a> {
    pub fn new(table: Vec<Vec<String>>) -> Result<Self, String> {
        let all_same_size;
        let ncols: usize;
        if let Some(first_row) = table.get(0) {
            ncols = first_row.len();
            all_same_size = table.iter().all(|row| row.len() == ncols)
        } else {
            return Err(format!("Attempt to create empty Ppt edit table")); 
        }
        if ! all_same_size {
            return Err(format!("Attempt to create Ppt edit table with rows of different size"));
        }
        Ok(PptEditTable { 
            matrix: table, 
            current_row: None, 
            current_column: None, 
            current_operation: PptOperation::EntireTable,
            ncols: ncols,
            unsaved: false,
            phetools: None,
        })
    }

    pub fn get_row(&self, row: usize) -> Option<Vec<String>> {
        match self.matrix.get(row) {
            Some(row) => Some(row.clone()),
            None => None
        }
    }

    pub fn new_row(&mut self, 
                    pmid: impl Into<String>, 
                    title: impl Into<String>, 
                    individual_id: impl Into<String>) -> Result<(), String> {
        match &self.phetools {
            Some(ptools) => {
               /* match ptools.new_row(pmid, title, individual_id) {
                    Ok(()) => Ok(()),
                    Err(e) => Err(e.to_string())
                } */
               Ok(())
            },
            None => {Err(format!("Attempt to add new row, but phetools not initialized"))}
        }
    }

    pub fn new_row_with_pt(&mut self, 
        pmid: impl Into<String>, 
        title: impl Into<String>, 
        individual_id: impl Into<String>) -> Result<(), String> {
        match &self.phetools {
        Some(ptools) => {
        /* match ptools.new_row(pmid, title, individual_id) {
                Ok(()) => Ok(()),
                Err(e) => Err(e.to_string())
            } */
        Ok(())
        },
        None => {Err(format!("Attempt to add new row, but phetools not initialized"))}
        }
}

    pub fn get_column(&self, col: usize) -> Result<Vec<String>, String> {
        if col >= self.ncols {
            return Err(format!("request to get row {} from table with only {} rows", col, self.ncols));
        }
        let mut column = Vec::new();
        for i in 0..self.ncols {
            column.push(self.matrix[i][col].clone());
        }
        Ok(column)
    }

    pub fn get_current_row(&self) -> Option<usize> {
        self.current_row
    }

    pub fn get_current_column(&self) -> Option<usize> {
        self.current_column
    }

    pub fn set_current_row(&mut self, row: usize) {
        if row > self.matrix.len() {
            self.current_row = None
        } else {
            self.current_row = Some(row)
        }
    } 

    pub fn set_current_column(&mut self, col: usize) {
        if col >= self.ncols {
            self.current_column = None
        } else {
            self.current_column = Some(col)
        }
    } 

    pub fn set_current_operation(&mut self, op: &str) -> Result<(), String> {
            match op {
                "show_column"=> {
                    self.current_operation = PptOperation::ShowColumn;
                },
                "show_row" => {
                    self.current_operation = PptOperation::ShowRow;
                }
                "table" => {
                    self.current_operation = PptOperation::EntireTable;
                }
                _ => {
                    self.current_operation = PptOperation::EntireTable;
                    return Err(format!("Did not recognize operation {}", op));
                }
            }
            Ok(())
    }

    pub fn set_value<T>(&mut self, r: usize, c: usize, value: T) -> Result<(), String>
    where T: Into<String>
    {
        if r > self.matrix.len() {
            return Err(format!("attempt to set row {} with nrows={}", r, self.matrix.len()));
        }
        if c > self.ncols {
            return Err(format!("attempt to set col {} with ncol={}", c, self.ncols));
        }
        self.matrix[r][c] = value.into();
        Ok(())
    }

}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_test_matrix<'a>() -> PptEditTable<'a> {
        let mut matrix: Vec<Vec<String>> = Vec::new();
        matrix.push(get_vec(1,2,3));
        matrix.push(get_vec(4,5,6));
        matrix.push(get_vec(7, 8, 9));
        let edit_table = PptEditTable::new(matrix);
        edit_table.unwrap()
    }


    fn get_vec(a: usize, b: usize, c: usize) -> Vec<String> {
        let mut v = vec![];
        v.push(format!("{}", a));
        v.push(format!("{}", b));
        v.push(format!("{}", c));
        v
    }

    #[test]
    fn test_get_col_or_row() {
        let edit_table = get_test_matrix();
        let col_0 = edit_table.get_column(0).unwrap();
        assert_eq!(get_vec(1,4,7), col_0);
        let col_1 = edit_table.get_column(1).unwrap();
        assert_eq!(get_vec(2,5,8), col_1);
        let col_2 = edit_table.get_column(2).unwrap();
        assert_eq!(get_vec(3,6,9), col_2);
        let row_0 = edit_table.get_row(0).unwrap();
        assert_eq!(get_vec(1,2,3), row_0);
        let row_1 = edit_table.get_row(1).unwrap();
        assert_eq!(get_vec(4,5,6), row_1);
        let row_2 = edit_table.get_row(2).unwrap();
        assert_eq!(get_vec(7,8,9), row_2);
    }

    #[test]
    fn test_set_get_cr() {
        let mut edit_table = get_test_matrix();
        let col = edit_table.get_current_column();
        assert!(col.is_none());
        edit_table.set_current_column(2);
        assert_eq!(2, edit_table.get_current_column().unwrap());
        edit_table.set_current_column(3);
        let col = edit_table.get_current_column();
        assert!(col.is_none());
    }

}