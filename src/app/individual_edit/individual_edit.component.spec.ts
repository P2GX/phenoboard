import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IndividualEditComponent } from './individual_edit.component';

describe('IndividualEditComponent', () => {
  let component: IndividualEditComponent;
  let fixture: ComponentFixture<IndividualEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndividualEditComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IndividualEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
