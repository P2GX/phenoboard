import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CohortSummaryComponent } from './cohortsummary.component';

describe('CohortSummaryComponent', () => {
  let component: CohortSummaryComponent;
  let fixture: ComponentFixture<CohortSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CohortSummaryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CohortSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
