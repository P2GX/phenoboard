import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PubmedComponent } from './pubmed.component';

describe('PubmedComponent', () => {
  let component: PubmedComponent;
  let fixture: ComponentFixture<PubmedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubmedComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PubmedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
