import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManualHgvsVariantDialog } from './manual-hgvs.component';

describe('TableEditorComponent', () => {
  let component: ManualHgvsVariantDialog;
  let fixture: ComponentFixture<ManualHgvsVariantDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualHgvsVariantDialog]
    }).compileComponents();

    fixture = TestBed.createComponent(ManualHgvsVariantDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
