import { computed, inject, Injectable, signal } from "@angular/core";
import { ColumnDto, EtlCellStatus, EtlCellValue, EtlColumnType, EtlDto } from "../models/etl_dto";
import { AgeInputService } from "./age_service";
import { DiseaseData } from "../models/cohort_dto";
import { PmidDto } from "../models/pmid_dto";




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
    const unknownSymbols = new Set(["u", "ukn", "unknown", "?", "n.k."]);
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