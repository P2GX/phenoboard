import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtlCellComponent } from './etlcell.component';

describe('EtlCellComponent', () => {
  let component: EtlCellComponent;
  let fixture: ComponentFixture<EtlCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EtlCellComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EtlCellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
