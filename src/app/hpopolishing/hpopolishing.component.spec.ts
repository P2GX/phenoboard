import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HpoPolishingComponent } from './hpopolishing.component';

describe('HpoPolishingComponent', () => {
  let component: HpoPolishingComponent;
  let fixture: ComponentFixture<HpoPolishingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HpoPolishingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HpoPolishingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
