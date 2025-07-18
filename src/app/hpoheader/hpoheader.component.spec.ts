import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HpoHeaderComponent } from './hpoheader.component';

describe('HpoHeaderComponent', () => {
  let component: HpoHeaderComponent;
  let fixture: ComponentFixture<HpoHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HpoHeaderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HpoHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
