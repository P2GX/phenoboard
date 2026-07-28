import { Component, computed, inject, input, output, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MinedCell, MappedTerm, ClinicalStatus } from '@workspace/ui';
import { AgeInputService } from '../services/age_service';
import { AddageComponent } from '../addages/addage.component';
import { IconComponent } from 'ng-hpo-uikit';
import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';

@Component({
  selector: 'app-mined-cell-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent
  ],
  templateUrl: './mined-cell-editor.component.html',
  styleUrls: ['./mined-cell-editor.component.scss'],
})
export class MinedCellEditorComponent {
  cell = input.required<MinedCell | undefined>();
  toExclude = input.required<{ id: string; label: string }[]>();
  cellChange = output<MinedCell>();
  excludeTerm = output<{ id: string; label: string }>();
  excludeAll = output<void>();
  restoreTerm = output<MappedTerm>();

  private ageService = inject(AgeInputService);
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);
  private elementRef = inject(ElementRef);

  // Active status menu open state tracker per term (keyed by hpoId)
  activeMenuId = signal<string | null>(null);
  // Help menu open state tracker
  isHelpOpen = signal(false);

  readonly observedTerms = computed(() =>
    this.cell()?.mappedTermList.filter((t) => t.status !== 'excluded'),
  );

  readonly excludedTerms = computed(() => {
    const currentCell = this.cell();
    return currentCell?.mappedTermList?.filter((t) => t.status === 'excluded') ?? [];
  });
  readonly hasExclusions = computed(() => (this.excludedTerms().length ?? 0) > 0);

  readonly Status = ClinicalStatus;
  readonly statusOptions = ['observed', 'excluded', 'na'];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.activeMenuId.set(null);
      this.isHelpOpen.set(false);
    }
  }

  toggleStatusMenu(hpoId: string, event: MouseEvent) {
    event.stopPropagation();
    this.isHelpOpen.set(false);
    this.activeMenuId.set(this.activeMenuId() === hpoId ? null : hpoId);
  }

  toggleHelpMenu(event: MouseEvent) {
    event.stopPropagation();
    this.activeMenuId.set(null);
    this.isHelpOpen.update((val) => !val);
  }

  updateStatus(term: MappedTerm, newStatus: string): void {
    const currentCell = this.cell();
    if (!currentCell) return;
    const updatedCell: MinedCell = {
      ...currentCell,
      mappedTermList: currentCell.mappedTermList.map((t) =>
        t.hpoId === term.hpoId ? { ...t, status: newStatus as ClinicalStatus } : t,
      ),
    };
    this.cellChange.emit(updatedCell);
    this.activeMenuId.set(null);
  }

  get availableOnsetTerms(): string[] {
    return this.ageService.selectedTerms();
  }

  updateOnset(term: MappedTerm, newOnset: string): void {
    const currentCell = this.cell();
    if (!currentCell) return;
    const updatedCell: MinedCell = {
      ...currentCell,
      mappedTermList: currentCell.mappedTermList.map((t) =>
        t.hpoId === term.hpoId ? { ...t, onset: newOnset } : t,
      ),
    };
    this.cellChange.emit(updatedCell);
  }

  addOnsetString(term: MappedTerm): void {
    const currentCell = this.cell();
    if (!currentCell) return;
    const componentRef: ComponentRef<AddageComponent> = createComponent(AddageComponent, {
      environmentInjector: this.injector,
    });
    // the age service will input the existing ages, we do not need to pass that here.    

    this.appRef.attachView(componentRef.hostView);
    const domElem = (componentRef.hostView as any).rootNodes[0] as HTMLElement;
    document.body.appendChild(domElem);

    const sub = componentRef.instance.saved.subscribe((result: any) => {
      sub.unsubscribe();
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
      domElem.remove();

      if (!result) return;
      if (typeof result !== 'string') {
        alert(`Addagecomponent did not return a string but instead: ${result}`);
        return;
      }
      this.ageService.addSelectedTerm(result);
      const updatedCell: MinedCell = {
        ...currentCell,
        mappedTermList: currentCell.mappedTermList.map((t) =>
          t.hpoId === term.hpoId ? { ...t, onset: result } : t,
        ),
      };
      this.cellChange.emit(updatedCell);
    });
  }
}