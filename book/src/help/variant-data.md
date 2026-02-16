# Variant Data

Phenoboard uses the [VariantValidator](https://variantvalidator.org/) API to validate HGVS expressions and ensure that variant descriptions are syntactically correct and consistent with reference sequences.

---

## Gene Information

To describe a variant unambiguously, Phenoboard requires the following:

- **Gene symbol**
- **HGNC identifier**
- **Reference transcript**

Providing all three ensures that variants are interpreted consistently across databases, publications, and analysis tools.

---

## HGNC Identifier

The **HUGO Gene Nomenclature Committee (HGNC)** provides standardized names for human genes.

Each gene has:

- An **approved gene symbol** (e.g., *MED16*)
- A unique **HGNC identifier** (e.g., **HGNC:17556**)

Using the HGNC identifier avoids ambiguity because gene symbols can occasionally change or be reused in different contexts.

Example:

> The gene encoding mediator complex subunit 16 has  
> **Symbol:** *MED16*  
> **HGNC ID:** HGNC:17556

You can search for gene information at the HGNC website:  
https://www.genenames.org/

---

## Transcript Information

Most human genes produce multiple transcripts (isoforms) due to **alternative splicing**. As a result, the same genomic variant can have **different coordinates and protein consequences** depending on the transcript used.

For example, the genomic variant:

- NC_000013.11:g.32363225A>G

occurs in the **BRCA2** gene but maps differently across transcripts:

- NM_000059.4:c.8023A>G → NP_000050.3:p.(Ile2675Val)
- NM_001406719.1:c.7927A>G → NP_001393648.1:p.(Ile2643Val)
- NM_001406722.1:c.1606A>G → NP_001393651.1:p.(Ile536Val)

One transcript is non-coding:

- NR_176251.1:n.8222A>G

This example illustrates an important principle:

!!! important "Why transcripts matter"
    A variant does not have a single consequence — its interpretation depends on the reference transcript.

Because of this, publications and clinical reports **must always specify both**:

1. The variant description
2. The transcript accession (e.g., NM_000059.4)

Older literature sometimes omits transcript information. In such cases, determining the correct transcript may require careful investigation and is sometimes impossible. When uncertainty remains, we recommend contacting the authors or excluding the publication from curation.

---

## MANE Select Transcripts

A **MANE Select transcript** is a standardized reference transcript chosen to promote consistent variant reporting.

MANE (Matched Annotation from NCBI and EMBL-EBI) transcripts have:

- Identical exon structure between **RefSeq** and **Ensembl/GENCODE**
- High biological and clinical relevance
- Broad community acceptance

There is typically **one MANE Select transcript per protein-coding gene**.

!!! tip "Recommendation"
    We strongly recommend using the **RefSeq MANE Select transcript** whenever available.

The Human Phenotype Ontology (HPO) project also curates variants using RefSeq MANE transcripts (for example: NM_130837.3).

---

## Entering Data in Phenoboard

Phenoboard provides tools to simplify data entry.

### Automatic retrieval

Use the **Fetch HGNC/Transcript Info** button to automatically retrieve:

- HGNC identifier
- RefSeq MANE Select transcript

from the HGNC database.

### Manual lookup

Alternatively, you can search manually:

HGNC website: https://www.genenames.org/

---

## Summary

To ensure accurate variant interpretation:

- Always provide the **gene symbol**
- Always include the **HGNC identifier**
- Always specify the **reference transcript**
- Prefer the **MANE Select transcript** when available
