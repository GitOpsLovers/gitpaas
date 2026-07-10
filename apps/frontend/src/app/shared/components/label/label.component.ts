import { Component, input } from '@angular/core';

/**
 * Form field label following the TailAdmin standard. Project text via `<ng-content>`.
 */
@Component({
    selector: 'app-label',
    templateUrl: './label.component.html',
})
export class LabelComponent {
    public readonly for = input<string>();

    public readonly className = input('');
}
