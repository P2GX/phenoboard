import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddVariantComponent } from './addvariant.component';

describe('AddVariantComponent', () => {
  let component: AddVariantComponent;
  let fixture: ComponentFixture<AddVariantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddVariantComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AddVariantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
