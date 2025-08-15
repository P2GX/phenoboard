import { CohortDtoService } from "../services/cohort_dto_service";
import { CohortDto } from '../models/cohort_dto';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  template: '' // Empty since this is an abstract base class
})
export abstract class TemplateBaseComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

  constructor(
    protected cohortService: CohortDtoService,
    protected ngZone: NgZone,
    protected cdRef: ChangeDetectorRef){
  }

  ngOnInit(): void {
    console.log(`🔄 ${this.constructor.name}: Setting up template subscription`);
    this.cohortService.cohortDto$
      .pipe(takeUntil(this.destroy$))
      .subscribe(template => {
        console.log(`📡 ${this.constructor.name}: template update`, template);
        console.log(`📡 ${this.constructor.name}: template update received`);
        console.log(`📡 ${this.constructor.name}: template is null?`, template === null);
        console.log(`📡 ${this.constructor.name}: template:`, template);
        if (template) {
          this.ngZone.run(() => {
               console.log(`🎯 ${this.constructor.name}: calling onTemplateLoaded`);
            this.onTemplateLoaded(template);
          });
        } else {
          this.ngZone.run(() => {
                 console.log(`❌ ${this.constructor.name}: calling onTemplateMissing`);
            this.onTemplateMissing();
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
  protected abstract onTemplateLoaded(template: CohortDto): void;

  /** Called when template is still missing (optional override) */
  protected onTemplateMissing(): void {
    // Default: do nothing. Subclasses can override to reload.
  }
}