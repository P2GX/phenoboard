import { Injectable } from "@angular/core";
import { ColumnType, EtlSessionDto, RawTableDto } from "../models/etl_dto";

// 4. ETL Session Service
@Injectable({
  providedIn: 'root'
})
export class EtlSessionService {
  private sessions = new Map<string, EtlSessionDto>();
  
  createSession(rawTable: RawTableDto): EtlSessionDto {
    const sessionId = this.generateId();
    const session: EtlSessionDto = {
      id: sessionId,
      rawTable,
      columnTransformations: rawTable.headers.map((header, index) => ({
        columnIndex: index,
        originalHeader: header,
        columnType: ColumnType.RAW,
        transformedHeader: header,
        originalValues: rawTable.rows.map(row => row[index] || ''),
        transformedValues: rawTable.rows.map(row => row[index] || ''),
        transformationRules: [],
        validationErrors: []
      })),
      currentColumnIndex: 0,
      isComplete: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  getSession(sessionId: string): EtlSessionDto | undefined {
    return this.sessions.get(sessionId);
  }
  
  updateSession(session: EtlSessionDto): void {
    session.updatedAt = new Date();
    this.sessions.set(session.id, session);
  }
  
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
  
  exportTransformedData(sessionId: string): any[] {
    const session = this.getSession(sessionId);
    if (!session) return [];
    
    const result: any[] = [];
    
    // Create header row
    const headers = session.columnTransformations
      .filter(col => col.columnType !== ColumnType.IGNORE)
      .map(col => col.transformedHeader);
    
    // Create data rows
    for (let rowIndex = 0; rowIndex < session.rawTable.totalRows; rowIndex++) {
      const row: any = {};
      session.columnTransformations
        .filter(col => col.columnType !== ColumnType.IGNORE)
        .forEach(col => {
          row[col.transformedHeader] = col.transformedValues[rowIndex] || '';
        });
      result.push(row);
    }
    
    return result;
  }
  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}