import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { defaultStatusDto, type StatusDto } from '../models/status_dto'

@Injectable({ providedIn: 'root' })
export class BackendStatusService {
    private statusSubject = new BehaviorSubject<StatusDto>(defaultStatusDto());
    status$ = this.statusSubject.asObservable();

    setStatus(status: StatusDto) {
        this.statusSubject.next(status);
    }

    getStatus(): StatusDto {
        return this.statusSubject.value;
    }

    clearStatus(){
        this.statusSubject.next(defaultStatusDto());
    }
}
