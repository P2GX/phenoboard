import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HpoTwostepComponent } from './hpotwostep.component';

describe('HpoTwostepComponent', () => {
  let component: HpoTwostepComponent;
  let fixture: ComponentFixture<HpoTwostepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HpoTwostepComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HpoTwostepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
