import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtlColumnEditComponent } from './etl_column_edit.component';

describe('EtlColumnEditComponent', () => {
  let component: EtlColumnEditComponent;
  let fixture: ComponentFixture<EtlColumnEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EtlColumnEditComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EtlColumnEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
