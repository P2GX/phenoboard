import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PyphetoolsComponent } from './pyphetools.component';

describe('PyphetoolsComponent', () => {
  let component: PyphetoolsComponent;
  let fixture: ComponentFixture<PyphetoolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PyphetoolsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PyphetoolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
