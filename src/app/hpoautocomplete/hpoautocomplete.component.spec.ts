import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HpoAutocompleteComponent } from './hpoautocomplete.component';

describe('HpoAutocompleteComponent', () => {
  let component: HpoAutocompleteComponent;
  let fixture: ComponentFixture<HpoAutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HpoAutocompleteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HpoAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
