export interface HpoAnnotationDto {
    label: string;      // e.g., "nystagmus"
    id: string;         // e.g., "HP:0000639"
    status: 'observed' | 'excluded' | 'na'; // results from fenominal 
    onset: string;    // e.g., 'Congenital onset', 'P3Y2D'
}


export interface  HpoTermDto {
    termId: string, // String representation of an HPO identifier, e.g., HP:0025234
    termLabel: String,  /// Corresponding HPO label, e.g., Parasomnia
    entry: String, /// Entry: can be observed, excluded, na, or a time String
}