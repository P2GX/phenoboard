import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CohortDialogComponent } from './cohortdialog.component';

describe('CohortDialogComponent', () => {
  let component: CohortDialogComponent;
  let fixture: ComponentFixture<CohortDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CohortDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CohortDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
