import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorialComponent } from './tutorial.component';

describe('HelpComponent', () => {
  let component: TutorialComponent;
  let fixture: ComponentFixture<TutorialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorialComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TutorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
