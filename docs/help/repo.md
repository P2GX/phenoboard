# Repo Quality Control

Optionally, users can create a repository with one subdirectory for each cohort. For the Phenopacket Store,
we have one folder for each gene, and the folder contains one "individuals" file for each disease entity (some genes
are associated with more than one Mendelian disease). There is one folder called "phenopackets" into which all
of the phenopackets are put.

This page provides quality control for the entire repository. For now, the following items are checked.

1. The Mode of inheritance is reflected in the allele count of each phenopacket (e.g., for a recessive disease, we expect two pathogenic alleles).
2. Each row in the "individuals" files has been exported to a phenopackets
3. There are no other files in the directory