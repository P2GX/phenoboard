import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeneEditComponent } from './gene_edit.component';

describe('GeneEditComponent', () => {
  let component: GeneEditComponent;
  let fixture: ComponentFixture<GeneEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneEditComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GeneEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
