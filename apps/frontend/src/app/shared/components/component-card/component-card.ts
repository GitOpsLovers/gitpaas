import { Component, Input } from '@angular/core';

/**
 * Reusable titled card container. Project content via `<ng-content>`.
 */
@Component({
    selector: 'app-component-card',
    templateUrl: './component-card.html',
})
export class ComponentCardComponent {
    @Input() public title!: string;
    @Input() public desc = '';
    @Input() public className = '';
}
