import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhetoolsloaderComponent } from './phetoolsloader.component';

describe('PhetoolsloaderComponent', () => {
  let component: PhetoolsloaderComponent;
  let fixture: ComponentFixture<PhetoolsloaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhetoolsloaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PhetoolsloaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
