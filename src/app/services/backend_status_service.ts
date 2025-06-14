import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { StatusDto } from '../models/status_dto'

@Injectable({ providedIn: 'root' })
export class BackendStatusService {
    private statusSubject = new BehaviorSubject<StatusDto | null>(null);
    status$ = this.statusSubject.asObservable();

    setStatus(status: StatusDto) {
        this.statusSubject.next(status);
    }

    getStatus(): StatusDto | null {
        return this.statusSubject.value;
    }
}
