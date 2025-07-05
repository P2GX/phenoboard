

export interface VariantDto {
    /** Either an HGVS string (e.g., c.123T>G) or a structural variant string like "DEL: deletion of exon 5" */
    variant_string: string;
    /** Transcript of reference for the gene (e.g. NM_000123.2). Not required for structural variants. */
    transcript?: string | null;
    /** HGNC identifier, e.g., HGNC:123 */
    hgnc_id: string;
    /** Gene symbol recommended by HGNC, e.g., FBN1 */
    gene_symbol: string;
    /** Whether the variant has been validated in the backend */
    validated: boolean;
    /** Whether this variant is structural (e.g., a deletion) */
    is_structural: boolean;
}



export interface VariantListDto {
    variantDtoList: VariantDto[]
} 


export interface StructuralType {
    label: string;
    id: string;
}