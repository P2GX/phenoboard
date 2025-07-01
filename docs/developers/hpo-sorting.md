# Sorting HPO terms

Phenoboard sorts the columns of the table using a depth-first search (DFS). This has the effect
of putting related terms close to each other, which makes curation of related concepts easier. This page summarizes the strategy used.

The logic of the code is implemented in the [GA4GH phetools](https://github.com/P2GX/ga4ghphetools) library, and we provide a summary here.


## DFS
<pre> ```
 pub fn arrange_term_ids(&mut self, hpo_terms_for_curation: &Vec<TermId>) 
    -> Vec<TermId> {
        self.hpo_curation_term_id_set.clear();
        for smt in hpo_terms_for_curation {
            self.hpo_curation_term_id_set.insert(smt.clone());
        }

        let neoplasm = TermId::from_str("HP:0002664").unwrap();
        let mut visited: HashSet<TermId> = HashSet::new();
        let mut ordered_term_id_list: Vec<TermId> = Vec::new();
        let mut neoplasm_terms = Vec::new();
        // First get any Neoplasm terms
        self.dfs(&neoplasm, &mut visited, &mut neoplasm_terms);
        // then arrange the remaining terms according to organ system
        self.dfs(&PHENOTYPIC_ABNORMALITY, &mut visited, &mut ordered_term_id_list);
        ordered_term_id_list.extend(neoplasm_terms);
        ordered_term_id_list
    }
    ``` </pre>
    That is, we use a DFS to order the terms, but place all neoplasm terms after the other terms.

    ## Using rearranged terms in phenoboard

    There are three situations in which we arrange terms

    1. When we initialize a new cohort, the user can provide seed terms. This is run through the
    <pre>```rust run_text_mining```</pre> function, which calls <pre>PhenoboardSingleton::map_text_to_term_list</pre> to return JSON representing these hits.
    TODO - refactor tu use DTOs

    2. When we add a single new HPO term to a cohort. This is run through the
    <pre>```rust add_hpo_term_to_cohort```</pre> function.

    3. When we add a new phenopacket row to a cohort. This is run through the 
     <pre>```rust add_new_row_to_cohort```</pre> function.

     The latter two calls need to rearrange the order of the columns of the existing terms. The strategy is as follows. We expect to get a TemplateDto object with all of the data of the cohort (including
     possibly edits). We also get the new information (new HPO term or new row). We transform the
     DTO into a domain object (``PheToolsTemplate``). We arrange the HPO Term ids to make a new Header object, and then we calculate a vector with the indices of the OLD columns in the NEW vector, allowing us to update simply. 

<pre>
```rust
pub fn add_hpo_term_to_cohort(
    &mut self,
    hpo_id: &str,
    hpo_label: &str) 
-> std::result::Result<(), ValidationErrors> {
    let mut verrs = ValidationErrors::new();
    let tid = TermId::from_str(hpo_id);
    if tid.is_err() {
        return Err(ValidationErrors::from_one_err(format!("Could not arrange terms: {}\n", hpo_id)));
    };
    let tid = tid.unwrap();
    let term = match &self.hpo.term_by_id(&tid) {
        Some(term) => term,
        None =>{ return  Err(ValidationErrors::from_one_err(format!("could not retrieve HPO term for '{hpo_id}'"))); }
    };
    // === STEP 1: Add new HPO term to existing terms and arrange TIDs ===
    let hpo_util = HpoUtil::new(self.hpo.clone());
    let mut all_tids = self.header.get_hpo_id_list()?;
    if all_tids.contains(&tid) {
        return Err(ValidationErrors::from_one_err(format!("Not allowed to add term {} because it already is present", &tid)));
    }
    all_tids.push(tid);
    let mut term_arrager = HpoTermArranger::new(self.hpo.clone());
    let arranged_terms = term_arrager.arrange_terms(&all_tids)?;
    // === Step 3: Rearrange the existing PpktRow objects to have the new HPO terms and set the new terms to "na"
    // strategy: Make a HashMap with all of the new terms, initialize the values to na. Clone this, pass it to the
    // PpktRow object, and update the map with the current values. The remaining (new) terms will be "na". Then use
    // the new HeaderDupletRow object to write the values.
    // 3a. Update the HeaderDupletRow object.
    let update_hdr = self.header.update_old(&arranged_terms);
    let updated_hdr_arc = Arc::new(update_hdr);
    let mut updated_ppkt_rows: Vec<PpktRow> = Vec::new();
    for ppkt in &self.ppkt_rows {
        let result = ppkt.update_header(updated_hdr_arc.clone());
        if let Err(e) = result {
            verrs.add_errors(e.errors());
        } else {
            let new_ppkt = result.unwrap();
            updated_ppkt_rows.push(new_ppkt);
        }
    }
    if verrs.has_error() {
        Err(verrs)
    } else {
        self.header = updated_hdr_arc.clone();
        self.ppkt_rows = updated_ppkt_rows;
        Ok(())
    }
}
````
</pre>
