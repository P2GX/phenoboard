import { computed, inject, Injectable, signal } from "@angular/core";
import { ColumnDto, EtlCellStatus, EtlCellValue, EtlColumnType, EtlDto } from "../models/etl_dto";
import { AgeInputService } from "./age_service";
import { DiseaseData } from "../models/cohort_dto";
import { PmidDto } from "../models/pmid_dto";


const AGE_TERM_MAP: Record<string, string> = {
  antenatal: "Antenal onset",
  neonate: "Neonatal onset",
  neonatal: "Neonatal onset",
  "neonatal onset": "Neonatal onset",
  newborn: "Neonatal onset",
  "newborn onset": "Neonatal onset",
  birth: "Congenital onset",
  congenital: "Congenital onset",
  child: "Childhood onset",
  childhood: "Childhood onset",
  adult: "Adult onset",
  adulthood: "Adult onset",
  unk: "na",
  na: "na"
};


// 4. ETL Session Service
@Injectable({
  providedIn: 'root'
})
export class EtlSessionService {
   // Root signal for ETL DTO
  private _etlDto = signal<EtlDto | null>(null);
  // expose as computed for read-only access
  public etlDto = computed(() => this._etlDto());
  private ageService = inject(AgeInputService);

 // private etlDtoSubject = new BehaviorSubject<EtlDto | null>(null);
  //etlDto$ = this.etlDtoSubject.asObservable();

  setEtlDto(dto: EtlDto) {
        this._etlDto.set(dto);
  }

   // Optional computed signal for derived UI state
   // If a column is transformed, then we are finished with each and every cell
    transformedColumns = computed(() => {
      const dto = this._etlDto();
      if (!dto) return [];
      return dto.table.columns.map(col =>
        col.values.length > 0 &&
        col.values.every(v => v.status === EtlCellStatus.Transformed)
      );
    });

  clearEtlDto() {
     this._etlDto.set(null);
  }

  columns = computed(() => this._etlDto()?.table.columns || []);

  updateColumns(newColumns: ColumnDto[]): void {
    const dto = this._etlDto();
    if (! dto) return;
    const new_dto: EtlDto = {
      ...dto,
      table: {
        ...dto.table,
        columns: newColumns
      }
    };
    this.setEtlDto(new_dto);
  }

  setDisease(disease: DiseaseData): void {
    const dto = this._etlDto();
    if (!dto) return;

    this.setEtlDto({
      ...dto,
      disease
    });
  }

  setPmidData(pmidDto: PmidDto): void {
    const dto = this._etlDto();
    if (!dto) return;
    this.setEtlDto({
      ...dto,
      pmid: pmidDto.pmid,
      title: pmidDto.title
    })
  }

  /**
   * Update a single cell in the ETL table.
   * @param colIndex - index of the column
   * @param rowIndex - index of the row
   * @param updater - function that receives the current EtlCellValue and returns a new one
   */
  updateCell(colIndex: number, rowIndex: number, updater: (cell: EtlCellValue) => EtlCellValue): void {
    const dto = this._etlDto();
    if (!dto) return;

    const newColumns = dto.table.columns.map((col, cIdx) => {
      if (cIdx !== colIndex) return col;

      const newValues = col.values.map((cell, rIdx) => {
        if (rIdx !== rowIndex) return cell;
        return updater(cell);
      });

      return { ...col, values: newValues };
    });

    this.updateColumns(newColumns);
  }

 
   
  

  /** Attempt to convert a sex/gender column into the required format */
  parseSexColumn(val: string | null | undefined): string | undefined {
    if (val == null || val.trim() === "") {
      return "na";
    }
    const value = val.toLowerCase().trim();
    const femaleSymbols = new Set(["female", "woman","f", "w", "girl", "fem"]);
    const maleSymbols = new Set(["male","man","m","boy", "masc"]);
    const unknownSymbols = new Set(["u", "ukn", "unknown", "?"]);
    const otherSymbols = new Set(["o", "other"]);
    if (femaleSymbols.has(value)) {
      return "F";
    } else if (maleSymbols.has(value)) {
      return "M";
    } else if (unknownSymbols.has(value)) {
      return "U";
    } else if (otherSymbols.has(value)) {
      return "O";
    } else {
      return undefined;
    }
  }

  /* Attempt to parse a deceased column (yes/no/na) */
  parseDeceasedColumn(val: string | null | undefined): string | undefined {
    if (!val) return undefined;
    const v = val.toLowerCase();
    if (v == "yes") { return "yes"; }
    else if (v == "no") { return "no"; }
    else if (v == "na") { return "na"}
    else { return undefined}
  }
  
  /* check if an entry is valid ISO8601, HPO Term, or Gestational notation. */
  validateAgeEntry(ageStr: string | null | undefined): string | undefined {
    if (! ageStr) return undefined;
    if (ageStr == "na") return "na";
    if (this.ageService.validateAgeInput(ageStr)) return ageStr;
    return undefined
  }
  
  /* Try to parse a variety of age strings to Iso8601. 
    If another kind of valid age string is found, keep it (.e., Gestational or ISO) */
  parseAgeToIso8601(ageStr: string | null | undefined): string | undefined {
    if (!ageStr?.trim()) return undefined;
    if (this.ageService.validateAgeInput(ageStr)) return ageStr;
    const lower = ageStr.trim().toLowerCase();
    if (AGE_TERM_MAP[lower]) return AGE_TERM_MAP[lower];
    
    const yearMatch = /(\d+(?:\.\d+)?)\s*(y(?:ear)?s?|yr?s?|yo)\b/.exec(lower);
    const monthMatch = /(\d+(?:\.\d+)?)\s*(m(?:onth)?s?|mo?s?)\b/.exec(lower);
    const dayMatch = /(\d+)\s*(d(?:ay)?s?)\b/.exec(lower);

    if (!yearMatch && !monthMatch && !dayMatch) return undefined;
    const rawYears: number = yearMatch ? parseFloat(yearMatch[1]) : 0;
    const rawMonths: number = monthMatch ? parseFloat(monthMatch[1]) : 0;
    const days: number = dayMatch ? parseInt(dayMatch[1], 10) : 0;

    const years = Math.floor(rawYears);
    const monthsFromYears = Math.round((rawYears - years) * 12);
    const totalMonths = Math.floor(rawMonths) + monthsFromYears;
    // Build ISO8601 string
    const parts = [
      years > 0 ? `${years}Y` : '',
      totalMonths > 0 ? `${totalMonths}M` : '',
      days > 0 ? `${days}D` : ''
    ].join('');
    return parts ? `P${parts}` : undefined;
  }

  /**
   * Converts a decimal number representing years into ISO 8601 duration format.
   * Examples: 
   * - "4" -> "P4Y"
   * - "4.5" -> "P4Y6M" 
   * - "2.25" -> "P2Y3M"
   * - "0.75" -> "P9M"
   * @param input - String containing a decimal number
   * @returns ISO 8601 duration string or empty string if invalid
   */
  parseDecimalYearsToIso8601(input: string | null | undefined): string {
    if (input == null || input == undefined) {
      return '';
    }
    const trimmed = input.trim();
    // May be integer or decimal
    const numberMatch = /^\d+(?:\.\d+)?$/.exec(trimmed);
    if (!numberMatch) {
      return '';
    }
    const totalYears = parseFloat(trimmed);
    if (isNaN(totalYears) || totalYears < 0) {
      return '';
    }
    const wholeYears = Math.floor(totalYears);
    const fractionalYears = totalYears - wholeYears;
    const months = Math.round(fractionalYears * 12);
    let result = 'P';
    if (wholeYears > 0) {
      result += `${wholeYears}Y`;
    }
    if (months > 0) {
      result += `${months}M`;
    }
    // Handle edge case where input is 0
    return result === 'P' ? '' : result;
  }




  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  validateEtlDto(etlDto: EtlDto): string | null {
    // Check if table exists
    if (!etlDto.table) {
      return "ETL DTO table not initialized";
    }
 
    // Check if columns exist
    if (!etlDto.table.columns || etlDto.table.columns.length === 0) {
      return "No columns found in ETL DTO table";
    }
    
    // Check each column
    for (let i = 0; i < etlDto.table.columns.length; i++) {
      const column = etlDto.table.columns[i];
      
      // Check header
      if (!column.header) {
        return `Column ${i + 1} is missing header information`;
      }
      
      if (!column.header.original) {
        return `Column ${i + 1} is missing original header name`;
      }

      // Validate HPO columns
      if (column.header.columnType === EtlColumnType.SingleHpoTerm) {
        if (!column.header.hpoTerms || column.header.hpoTerms.length !== 1) {
          return `SingleHpoTerm column '${column.header.original}' must have exactly one HPO term, found ${column.header.hpoTerms?.length || 0}`;
        }
      }

      if (column.header.columnType === EtlColumnType.MultipleHpoTerm) {
        if (!column.header.hpoTerms || column.header.hpoTerms.length === 0) {
          return `MultipleHpoTerms column '${column.header.original}' must have at least one HPO term`;
        }
      }
      if (!column.values) {
        return `Column '${column.header.original}' has no values`;
      }
    } 
    
    // Check row consistency
    const expectedRowCount = etlDto.table.columns[0].values.length;
    for (const column of etlDto.table.columns) {
      if (column.values.length !== expectedRowCount) {
        return `Column '${column.header.original}' has ${column.values.length} rows, expected ${expectedRowCount}`;
      }
    }
    return null; // No errors found
  }
}