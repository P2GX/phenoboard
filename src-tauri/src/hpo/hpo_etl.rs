use std::collections::{HashMap, HashSet};
use crate::hpo::{MappedTerm, MinedCell, MiningConcept};



/// Creates row-aware HPO mappings by grouping identical cell texts and
/// attaching all matching HPO concepts to each group.
///
/// # Overview
///
/// This function takes:
/// - the original spreadsheet cell values (one per row), and
/// - a list of canonical [`MiningConcept`]s, each containing the row indices
///   where that concept applies,
///
/// and produces a list of [`MinedCell`]s such that:
///
/// - Each `MinedCell` corresponds to **one unique cell text**
/// - Its `row_index_list` contains **all rows where that text occurs**
/// - Its `hpo_duplet_list` contains **all HPO terms from concepts that apply
///   to any of those rows**
///
/// This allows identical spreadsheet entries to be processed once while
/// preserving row-level provenance.
///
/// # Behavior
///
/// 1. Cell values are grouped by identical text.
/// 2. For each group of rows:
///    - All `MiningConcept`s whose `row_index_list` intersects the group
///      are selected.
///    - Their suggested HPO terms are collected into HPO duplets.
/// 3. A single [`MinedCell`] is created per unique cell text.
///
/// The resulting vector has no guaranteed ordering.
///
/// # Assumptions
///
/// - `mining_results` contains **canonical concepts**, i.e. at most one
///   `MiningConcept` per unique `original_text`.
/// - Row indices in `MiningConcept::row_index_list` refer to indices
///   in the original `cell_values` vector.
/// - Onset information is not yet row-specific and is currently set
///   to a placeholder value.
pub fn create_cell_mappings(
    cell_values: Vec<String>,
    mining_results: Vec<MiningConcept>,
) -> Result<Vec<MinedCell>, String> {
    let mut mined_cells: Vec<MinedCell> = Vec::new();
    // collect identical entries of original cell values
    let mut rows_by_text: HashMap<String, Vec<usize>> = HashMap::new();
    for (row_index, text) in cell_values.into_iter().enumerate() {
        rows_by_text
            .entry(text)
            .or_default()
            .push(row_index);
    }
    for (cell_text, row_indices) in rows_by_text {
        let row_set: HashSet<usize> = row_indices.iter().copied().collect();
        let mut mapped_terms: Vec<MappedTerm> = Vec::new();
        // 3. Find concepts that apply to any of these rows
        for concept in &mining_results {
            if concept
                .row_index_list
                .iter()
                .any(|idx| row_set.contains(idx))
            {
                for term in &concept.suggested_terms {
                    mapped_terms.push(MappedTerm::new(&term.id, &term.label));
                }
            }
        }

        mined_cells.push(MinedCell {
            cell_text,
            row_index_list: row_indices,
            mapped_term_list: mapped_terms,
        });
    }

    Ok(mined_cells)
}



fn mined_cell_to_string(cell: &MinedCell) -> String {
    let mut items: Vec<String> = Vec::new();
    for mt in &cell.mapped_term_list {
        let onset = mt.onset.to_string();
        let status = mt.status.to_string();
        items.push(format!("{}-{}-{}", mt.hpo_id, status, onset));
    }
    items.join(";")
}

pub fn get_multi_hpo_strings(mined_cells: Vec<MinedCell>) -> Result<Vec<String>, String> {
    let mut index_map: HashMap<usize, String> = HashMap::new();
    let mut max_index: usize = 0;
    for cell in mined_cells {
        let content = mined_cell_to_string(&cell);
        for i in cell.row_index_list {
            if index_map.insert(i, content.clone()).is_some() {
                return Err(format!("Double index for mutli HPO mappings: {}", i));
            }
            max_index = max_index.max(i);
        }
    }
   let hpo_strings = (0..=max_index)
        .map(|i| {
            index_map.remove(&i).ok_or_else(|| {
                format!("Missing index in sequence: {}", i)
            })
        })
        .collect::<Result<Vec<String>, String>>()?;

    Ok(hpo_strings)
}