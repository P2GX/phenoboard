import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ColumnDto } from "../models/etl_dto";
import { Component, Inject } from "@angular/core";
import { MatInputModule } from "@angular/material/input";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';


@Component({
    selector: 'etl-column-edit',
    templateUrl: './etl_column_edit.component.html',
    imports: [MatInputModule, MatAutocompleteModule, MatSelectModule, MatSlideToggleModule, FormsModule]
})
export class EtlColumnEditComponent {
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { column: ColumnDto },
        private dialogRef: MatDialogRef<EtlColumnEditComponent>
    ) {}

    save(): void {
        this.dialogRef.close(this.data.column);
    }

    cancel(): void {
        this.dialogRef.close(); // undefined means cancel
    }
}
