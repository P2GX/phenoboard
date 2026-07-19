import { RowData, CellValue, getRowId } from '@workspace/ui';

export interface TableRowVM {
  id: string;
  individualId: string;
  pmid: string;
  title: string;
  comment: string;
  ageOfOnset: string;
  ageAtLastEncounter: string;
  deceased: string;
  sex: string;
  hasObservedHpo: boolean;
  alleleCountMap: { [x: string]: number };
  alleles: {
    key: string;
    count: number;
    shortDisplay: string | undefined;
    validated: boolean;
  }[];
  hpoCells: {
    originalCell: CellValue;
    displayValue: string;
    cssClass: string;
  }[];
}

export class CohortViewModel {
  static create(
    rows: RowData[],
    alleleDisplayMap: Map<string, string>,
    validatedSet: Set<string>,
  ): TableRowVM[] {
    return rows.map((row) => ({
      id: getRowId(row.individualData),
      individualId: row.individualData.individualId,
      pmid: row.individualData.pmid,
      title: row.individualData.title,
      comment: row.individualData.comment,
      ageOfOnset: row.individualData.ageOfOnset,
      ageAtLastEncounter: row.individualData.ageAtLastEncounter,
      deceased: row.individualData.deceased,
      sex: row.individualData.sex,
      hasObservedHpo: row.hpoData.some((c) => c.type === 'Observed' || c.type === 'OnsetAge'),
      alleleCountMap: { ...row.alleleCountMap },
      alleles: Object.entries(row.alleleCountMap).map(([key, count]) => ({
        key,
        count,
        shortDisplay: alleleDisplayMap.get(key),
        validated: validatedSet.has(key),
      })),
      hpoCells: row.hpoData.map((cell) => ({
        originalCell: cell,
        displayValue: this.getCellDisplay(cell),
        cssClass: this.getCellClass(cell),
      })),
    }));
  }

  private static getCellDisplay(cell: CellValue): string {
    switch (cell.type) {
      case 'Observed':
        return '✅';
      case 'Excluded':
        return '❌';
      case 'Na':
        return 'n/a';
      case 'OnsetAge':
        return cell.data || 'Unknown';
      default:
        //  safety fallback for any type that doesn't have 'data'
        return 'Unknown';
    }
  }

  private static getCellClass(cell: CellValue): string {
    return `${cell.type.toLowerCase()}-cell`;
  }
}
