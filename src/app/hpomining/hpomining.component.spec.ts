import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HpoMiningComponent } from './hpomining.component';

describe('HpoMiningComponent', () => {
  let component: HpoMiningComponent;
  let fixture: ComponentFixture<HpoMiningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HpoMiningComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HpoMiningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
