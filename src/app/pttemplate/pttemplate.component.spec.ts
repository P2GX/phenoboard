import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PtTemplateComponent } from './pttemplate.component';

describe('PtTemplateComponent', () => {
  let component: PtTemplateComponent;
  let fixture: ComponentFixture<PtTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PtTemplateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PtTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
