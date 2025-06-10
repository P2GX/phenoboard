import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddcaseComponent } from './addcase.component';

describe('AddcaseComponent', () => {
  let component: AddcaseComponent;
  let fixture: ComponentFixture<AddcaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddcaseComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddcaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
