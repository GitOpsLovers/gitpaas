import { Component, input, output } from '@angular/core';

import { Project } from '../../../domain/models/project.model';

import { DropdownComponent } from '@shared/components/dropdown/dropdown.component';

@Component({
    selector: 'app-project-card',
    templateUrl: './project-card.component.html',
    imports: [DropdownComponent],
})

/**
 * Project card component
 */
export class ProjectCardComponent {
    public readonly project = input.required<Project>();

    public readonly edit = output<Project>();

    public readonly delete = output<Project>();
}
