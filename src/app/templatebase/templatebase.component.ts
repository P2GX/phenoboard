import { CohortDtoService } from "../services/cohort_dto_service";
import { CohortData } from '../models/cohort_dto';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  template: '' // Empty since this is an abstract base class
})
export abstract class TemplateBaseComponent implements OnInit, OnDestroy {
  
  protected destroy$ = new Subject<void>();

  constructor(
    protected cohortService: CohortDtoService,
    protected ngZone: NgZone,
    protected cdRef: ChangeDetectorRef){
  }

  /**
   * a) this.cohortService.cohortDto$ is the observable stream of the cohort state from the service.
   * Every time the service emits a new CohortDto (via setCohortDto), this will fire.
   * b)  .pipe(takeUntil(this.destroy$)): As soon as this.destroy$ emits (in ngOnDestroy), 
   * the subscription is cleaned up (thereby preventing memory leaks).
   * c) .subscribe(template => { … }): reacts to new values of the cohortDto
   * d) Subclasses should implement this.onTemplateLoaded(template) -> to update local UI state only
   * or to clear content if CohortDto is null. These methods should not
   * write back into the service, as this could cause an infinite loop.
   */
  ngOnInit(): void {
    console.log(`🔄 ${this.constructor.name}: Setting up template subscription`);
    this.cohortService.cohortDto$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cohortDto => {
        if (cohortDto) {
          this.ngZone.run(() => {
               console.log(`🎯 ${this.constructor.name}: calling onCohortDtoLoaded with `, cohortDto);
            this.onCohortDtoLoaded(cohortDto);
          });
        } else {
          this.ngZone.run(() => {
                 console.log(`❌ ${this.constructor.name}: calling onTemplateMissing`);
            this.onCohortDtoMissing();
          });
        }
      });
  }

  ngOnDestroy(): void {
    console.log(`🧹 ${this.constructor.name}: Cleaning up subscription`);
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Called when a valid template is available */
  protected abstract onCohortDtoLoaded(template: CohortData): void;

  /** Called when template is still missing (optional override) */
  protected onCohortDtoMissing(): void {
    // Default: do nothing. Subclasses can override to reload.
  }
}