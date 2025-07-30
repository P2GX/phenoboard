import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValueMappingComponent } from './valuemapping.component';

describe('ValueMappingComponent', () => {
  let component: ValueMappingComponent;
  let fixture: ComponentFixture<ValueMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValueMappingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ValueMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
