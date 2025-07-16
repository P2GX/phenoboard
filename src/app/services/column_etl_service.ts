import { Injectable } from "@angular/core";
import { ColumnTransformationDto, ColumnType, TransformationRule } from "../models/etl_dto";

@Injectable({
  providedIn: 'root'
})
export class ColumnTransformationService {
  
  createColumnTransformation(
    columnIndex: number, 
    originalHeader: string, 
    originalValues: string[]
  ): ColumnTransformationDto {
    return {
      columnIndex,
      originalHeader,
      columnType: ColumnType.RAW,
      transformedHeader: originalHeader,
      originalValues: [...originalValues],
      transformedValues: [...originalValues],
      transformationRules: [],
      validationErrors: []
    };
  }
  
  applyTransformationRule(
    transformation: ColumnTransformationDto, 
    rule: TransformationRule
  ): ColumnTransformationDto {
    const updated = { ...transformation };
    updated.transformationRules = [...transformation.transformationRules, rule];
    
    switch (rule.type) {
      case 'replace':
        updated.transformedValues = this.applyReplaceRule(
          updated.transformedValues, 
          rule.sourceValue!, 
          rule.targetValue!
        );
        break;
      case 'regex':
        updated.transformedValues = this.applyRegexRule(
          updated.transformedValues, 
          rule.pattern!, 
          rule.targetValue!
        );
        break;
      case 'lookup':
        updated.transformedValues = this.applyLookupRule(
          updated.transformedValues, 
          rule.lookupTable!
        );
        break;
      case 'function':
        updated.transformedValues = this.applyFunctionRule(
          updated.transformedValues, 
          rule.functionName!
        );
        break;
    }
    
    // Validate after transformation
    updated.validationErrors = this.validateTransformation(updated);
    
    return updated;
  }
  
  private applyReplaceRule(values: string[], sourceValue: string, targetValue: string): string[] {
    return values.map(value => value === sourceValue ? targetValue : value);
  }
  
  private applyRegexRule(values: string[], pattern: string, replacement: string): string[] {
    const regex = new RegExp(pattern, 'g');
    return values.map(value => value.replace(regex, replacement));
  }
  
  private applyLookupRule(values: string[], lookupTable: { [key: string]: string }): string[] {
    return values.map(value => lookupTable[value] || value);
  }
  
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
  
  private validateTransformation(transformation: ColumnTransformationDto): string[] {
    const errors: string[] = [];
    
    switch (transformation.columnType) {
      case ColumnType.HPO_TERM:
        errors.push(...this.validateHpoTerms(transformation.transformedValues));
        break;
      case ColumnType.GENE_SYMBOL:
        errors.push(...this.validateGeneSymbols(transformation.transformedValues));
        break;
      case ColumnType.PATIENT_ID:
        errors.push(...this.validatePatientIds(transformation.transformedValues));
        break;
    }
    
    return errors;
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