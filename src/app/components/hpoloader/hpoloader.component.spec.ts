import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HpoloaderComponent } from './hpoloader.component';

describe('HpoloaderComponent', () => {
  let component: HpoloaderComponent;
  let fixture: ComponentFixture<HpoloaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HpoloaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HpoloaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
