import { Injectable } from "@angular/core";
import {  } from "../models/etl_dto";

@Injectable({
  providedIn: 'root'
})
export class ColumnTransformationService {
  
  
  
  
  private applyFunctionRule(values: string[], functionName: string): string[] {
    switch (functionName) {
      case 'toUpperCase':
        return values.map(value => value.toUpperCase());
      case 'toLowerCase':
        return values.map(value => value.toLowerCase());
      case 'trim':
        return values.map(value => value.trim());
      case 'extractHpoId':
        return values.map(value => this.extractHpoId(value));
      case 'normalizeGeneName':
        return values.map(value => this.normalizeGeneName(value));
      default:
        return values;
    }
  }
  
  private extractHpoId(value: string): string {
    const match = value.match(/HP:\d{7}/);
    return match ? match[0] : value;
  }
  
  private normalizeGeneName(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  
  
  
  private validateHpoTerms(values: string[]): string[] {
    const errors: string[] = [];
    values.forEach((value, index) => {
      if (value && !value.match(/^HP:\d{7}$/)) {
        errors.push(`Row ${index + 1}: Invalid HPO term format: ${value}`);
      }
    });
    return errors;
  }
  
  private validateGeneSymbols(values: string[]): string[] {
    const errors: string[] = [];
    values.forEach((value, index) => {
      if (value && !value.match(/^[A-Z][A-Z0-9]*$/)) {
        errors.push(`Row ${index + 1}: Invalid gene symbol format: ${value}`);
      }
    });
    return errors;
  }
  
  private validatePatientIds(values: string[]): string[] {
    const errors: string[] = [];
    const seen = new Set<string>();
    values.forEach((value, index) => {
      if (value) {
        if (seen.has(value)) {
          errors.push(`Row ${index + 1}: Duplicate patient ID: ${value}`);
        } else {
          seen.add(value);
        }
      }
    });
    return errors;
  }
}