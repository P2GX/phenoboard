import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddageComponent } from './addage.component';

describe('AddageComponent', () => {
  let component: AddageComponent;
  let fixture: ComponentFixture<AddageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AddageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
