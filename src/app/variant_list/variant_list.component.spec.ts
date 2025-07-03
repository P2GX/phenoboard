import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariantListComponent } from './variant_list.component';

describe('VariantListComponent', () => {
  let component: VariantListComponent;
  let fixture: ComponentFixture<VariantListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariantListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
