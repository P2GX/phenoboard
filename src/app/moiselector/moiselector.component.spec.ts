import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoiSelectorComponent } from './moiselector.component';

describe('MoiSelectorComponent', () => {
  let component: MoiSelectorComponent;
  let fixture: ComponentFixture<MoiSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoiSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MoiSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
