export interface HpoAnnotationDto {
    label: string;      // e.g., "nystagmus"
    id: string;         // e.g., "HP:0000639"
    status: 'observed' | 'excluded' | 'na'; // results from fenominal 
    onset: string;    // e.g., 'Congenital onset', 'P3Y2D'
}