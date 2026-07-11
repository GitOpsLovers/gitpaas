import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';

export interface Select2Option {
    value: string;
    label: string;
}

@Component({
    selector: 'app-select2',
    templateUrl: './select2.component.html',
    imports: [FormsModule, NgSelectComponent, NgLabelTemplateDirective, NgOptionTemplateDirective],
})

/**
 * Select2 component
 */
export class Select2Component {
    public readonly options = input.required<Select2Option[]>();

    public readonly value = model<string>('');

    public readonly placeholder = input('Select…');

    public readonly searchPlaceholder = input('Search…');

    public readonly disabled = input(false);
}
