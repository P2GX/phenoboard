import { computed, Injectable, signal } from '@angular/core';
import { defaultStatusDto, type StatusDto } from '../models/status_dto'

@Injectable({ providedIn: 'root' })
export class BackendStatusService {

    private _status = signal<StatusDto>(defaultStatusDto());
    status = this._status.asReadonly();

    hpoLoaded = computed(() => this._status().hpoLoaded);
    hpoVersion = computed(() => this._status().hpoVersion);

   

    setStatus(status: StatusDto) {
        this._status.set(status);
    }

    getStatus(): StatusDto {
        return this._status();
    }

    clearStatus(){
        this._status.set(defaultStatusDto());
    }
}
