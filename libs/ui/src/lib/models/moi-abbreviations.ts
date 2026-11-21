
export const MOI_ABBREVIATIONS: Record<string, string> = {
  'HP:0000006': 'AD',   // Autosomal dominant inheritance
  'HP:0000007': 'AR',   // Autosomal recessive inheritance
  'HP:0001417': 'XL',   // X-linked inheritance
  'HP:0001423': 'XLD',  // X-linked dominant inheritance
  'HP:0001419': 'XLR',  // X-linked recessive inheritance
  'HP:0001427': 'MI',   // Mitochondrial inheritance
  'HP:0001450': 'YL',   // Y-linked inheritance
  'HP:0010985': 'GD',   // Gonosomal dominant inheritance
  'HP:0003745': 'SP',   // Sporadic
  'HP:0001426': 'NMI',   // "Non-Mendelian inheritance",
  'HP:0001442': 'SM',   // Typified by somatic mosaicism
};

export function getMoiAbbreviation(hpoId: string): string {
  return MOI_ABBREVIATIONS[hpoId] ?? '?';
}