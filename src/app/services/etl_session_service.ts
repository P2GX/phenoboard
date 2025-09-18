import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { EtlColumnType, EtlDto } from "../models/etl_dto";
import { ConfigService } from "./config.service";


// 4. ETL Session Service
@Injectable({
  providedIn: 'root'
})
export class EtlSessionService {
  

  constructor(private configService: ConfigService){
      console.log('🟡 EtlSessionService instance created');
  }

  private etlDtoSubject = new BehaviorSubject<EtlDto | null>(null);
  etlDto$ = this.etlDtoSubject.asObservable();

  setEtlDto(dto: EtlDto) {
    this.etlDtoSubject.next(dto);
  }
  
  getEtlDto(): EtlDto | null {
    const current = this.etlDtoSubject.getValue();
    return current;
  }

  clearEtlDto() {
    this.etlDtoSubject.next(null);
  }
  

  /** Attempt to convert a sex/gender column into the required format */
  parseSexColumn(val: string | null | undefined): string {
    if (val == null || val.trim() === "") {
      return "na";
    }
    const value = val.toLowerCase().trim();
    const femaleSymbols = new Set(["female", "woman","f", "w", "girl", "fem"]);
    const maleSymbols = new Set(["male","man","m","boy", "masc"]);
    if (femaleSymbols.has(value)) {
      return "F";
    } else if (maleSymbols.has(value)) {
      return "M";
    } else {
      return val;
    }
  }
  
  
  parseAgeToIso8601(ageStr: string | null | undefined): string {
    if (ageStr == null || ageStr == undefined) {
      return '';
    }
    const lower = ageStr.trim().toLowerCase();

    // Match decimal years like "2.5 y" or "2.5 years"
    const decimalYearMatch = /(\d+(?:\.\d+)?)\s*(y|year|years)\b/.exec(lower);
    if (decimalYearMatch && !lower.includes('month') && !lower.includes('day')) {
      const yearsFloat = parseFloat(decimalYearMatch[1]);
      const years = Math.floor(yearsFloat);
      const months = Math.round((yearsFloat - years) * 12);
      let result = 'P';
      if (years > 0) result += `${years}Y`;
      if (months > 0) result += `${months}M`;
      return result;
    }

    const yearMatch = /(\d+(?:\.\d+)?)\s*(y|year|years)\b/.exec(lower);
    const monthMatch = /(\d+(?:\.\d+)?)\s*(m|month|months)\b/.exec(lower);
    const dayMatch = /(\d+)\s*(d|day|days)\b/.exec(lower);

    const rawYears = yearMatch ? parseFloat(yearMatch[1]) : 0;
    const rawMonths = monthMatch ? parseFloat(monthMatch[1]) : 0;
    const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;

    const years = Math.floor(rawYears);
    const extraMonths = Math.round((rawYears - years) * 12);
    const months = Math.floor(rawMonths) + extraMonths;

    let result = 'P';
    if (years > 0) result += `${years}Y`;
    if (months > 0) result += `${months}M`;
    if (days > 0) result += `${days}D`;

    return result !== 'P' ? result : '';
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
      
      // Check values exist
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