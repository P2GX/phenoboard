# HGVS

This class of variant refers to any variant that can be coded using transcript-based
HGVS nomenclature (from the [Human Genome Variation Society (HGVS)](https://hgvs-nomenclature.org/stable/)). In practice, these are relatively small (usually less than 25 nucleotides) changes that are located within the transcript sequence of a gene. 

Phenoboard operates on a cohort-basis in which one transcript of reference is used for the entire cohort. For instance, if we wanted to code this variant: [NM_000138.5(FBN1):c.8057G>T (p.Cys2686Phe)](https://www.ncbi.nlm.nih.gov/clinvar/variation/1071312/), then the transcript (NM_000138.5), would be available for the entire cohort and we would enter
``c.8057G>T`` (only). Variants in non-coding transcripts, such as [NR_003137.3(RNU4-2):n.69C>T](https://www.ncbi.nlm.nih.gov/clinvar/variation/3384180/) can be entered using the "n." notation (in this example we would enter ``n.69C>T]``).
