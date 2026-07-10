import { Component, input } from '@angular/core';

@Component({
    selector: 'app-component-card',
    templateUrl: './component-card.component.html',
})

/**
 * Component card component
 */
export class ComponentCardComponent {
    public readonly title = input.required<string>();

    public readonly desc = input('');

    public readonly className = input('');
}
