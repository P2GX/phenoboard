import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTemplateComponent } from './newtemplate.component';

describe('NewTemplateComponent', () => {
  let component: NewTemplateComponent;
  let fixture: ComponentFixture<NewTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTemplateComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NewTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
