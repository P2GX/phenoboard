import { Injectable, signal, WritableSignal } from '@angular/core';
import { PmidDto } from '../models/pmid_dto';

@Injectable({
  providedIn: 'root'
})
export class PmidService {
  private _pmids: WritableSignal<PmidDto[]> = signal<PmidDto[]>([]);
  constructor() {}

  /** Read-only access for components */
  get pmids(): PmidDto[] {
    return this._pmids();
  }
  
  /** Expose signal directly */
  get pmidsSignal(): WritableSignal<PmidDto[]> {
    return this._pmids;
  }

  /** Add a new PMID if it doesn't exist */
  addPmid(pmid: PmidDto): void {
    this._pmids.update(current => {
      if (current.some(p => p.pmid === pmid.pmid)) return current;
      return [...current, pmid];
    });
  }

  /** Update an existing PMID */
  updatePmid(pmid: PmidDto): void {
    this._pmids.update(current => {
      const index = current.findIndex(p => p.pmid === pmid.pmid);
      if (index === -1) return current;
      const updated = [...current];
      updated[index] = pmid;
      return updated;
    });
  }

  /** Remove a PMID by its number */
  removePmid(pmidNumber: string): void {
    this._pmids.update(current => current.filter(p => p.pmid !== pmidNumber));
  }

   /** Get a PMID by number (read-only) */
  getPmidByNumber(pmidNumber: string): PmidDto | undefined {
    return this._pmids().find(p => p.pmid === pmidNumber);
  }

  /** Clear all PMIDs */
  clearAllPmids(): void {
    this._pmids.set([]);
  }
}