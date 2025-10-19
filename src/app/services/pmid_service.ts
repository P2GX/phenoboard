import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PmidDto } from '../models/pmid_dto';

@Injectable({
  providedIn: 'root'
})
export class PmidService {
  private pmidsSubject = new BehaviorSubject<PmidDto[]>([]);
  public pmids$: Observable<PmidDto[]> = this.pmidsSubject.asObservable();

  constructor() {
  }

  getPmids(): PmidDto[] {
    return this.pmidsSubject.value;
  }

  addPmid(pmid: PmidDto): void {
    const currentPmids = this.pmidsSubject.value;
    
    // Check if PMID already exists
    const exists = currentPmids.some(p => p.pmid === pmid.pmid);
    if (!exists) {
      const updatedPmids = [...currentPmids, pmid];
      this.pmidsSubject.next(updatedPmids);
    }
  }

  updatePmid(pmid: PmidDto): void {
    const currentPmids = this.pmidsSubject.value;
    const index = currentPmids.findIndex(p => p.pmid === pmid.pmid);
    
    if (index !== -1) {
      const updatedPmids = [...currentPmids];
      updatedPmids[index] = pmid;
      this.pmidsSubject.next(updatedPmids);
    }
  }

  removePmid(pmid: string): void {
    const currentPmids = this.pmidsSubject.value;
    const updatedPmids = currentPmids.filter(p => p.pmid !== pmid);
    this.pmidsSubject.next(updatedPmids);
  }

  getPmidByNumber(pmidNumber: string): PmidDto | undefined {
    return this.pmidsSubject.value.find(p => p.pmid === pmidNumber);
  }

  clearAllPmids(): void {
    this.pmidsSubject.next([]);
  }
}