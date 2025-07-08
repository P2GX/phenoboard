import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableEditorComponent } from './tableeditor.component';

describe('TableEditorComponent', () => {
  let component: TableEditorComponent;
  let fixture: ComponentFixture<TableEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableEditorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TableEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
