import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiseaseEditComponent } from './disease_edit.component';

describe('DiseaseEditComponent', () => {
  let component: DiseaseEditComponent;
  let fixture: ComponentFixture<DiseaseEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiseaseEditComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DiseaseEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
