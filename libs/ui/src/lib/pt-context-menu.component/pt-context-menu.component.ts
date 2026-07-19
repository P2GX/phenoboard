import { Component, input, output } from "@angular/core";

@Component({
  selector: 'pt-app-context-menu',
  template: `
    <div class="menu-overlay" [style.left.px]="x()" [style.top.px]="y()">
      <div class="menu-body">
        <ng-content></ng-content> <!-- The HPO Panel goes here -->
      </div>
      <div class="menu-footer">
        <button class="btn-outline-cancel" (click)="close.emit()">Cancel</button>
        <button class="btn-outline-primary"  (click)="confirm.emit()">OK</button>
      </div>
    </div>
  `,
  styles: [`
    .menu-overlay {
      position: fixed;
      z-index: 9999;
      background: white;
      border: 1px solid #ccc;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
    }
    .menu-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 10px;
      border-top: 1px solid #eee;
    }
  `]
})
export class PtContextMenuComponent {
  x = input.required<number>();
  y = input.required<number>();
  close = output<void>();
  confirm = output<void>(); 
}