import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddagesComponent } from './addages.component';

describe('AddagesComponent', () => {
  let component: AddagesComponent;
  let fixture: ComponentFixture<AddagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddagesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AddagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
