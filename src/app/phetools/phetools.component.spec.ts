import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhetoolsComponent } from './phetools.component';

describe('PhetoolsComponent', () => {
  let component: PhetoolsComponent;
  let fixture: ComponentFixture<PhetoolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhetoolsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PhetoolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
