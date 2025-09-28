import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManualStructuralVariantDialog } from './manual-sv.component';

describe('TableEditorComponent', () => {
  let component: ManualStructuralVariantDialog;
  let fixture: ComponentFixture<ManualStructuralVariantDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualStructuralVariantDialog]
    }).compileComponents();

    fixture = TestBed.createComponent(ManualStructuralVariantDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
