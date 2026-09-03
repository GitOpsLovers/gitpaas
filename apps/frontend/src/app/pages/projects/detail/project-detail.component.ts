import { Component, input } from '@angular/core';

import { ProjectDetailComponent } from '@features/projects/ui/containers/project-detail/project-detail.component';

@Component({
    selector: 'app-project-detail-page',
    templateUrl: './project-detail.component.html',
    imports: [ProjectDetailComponent],
})

/**
 * Project detail page.
 */
export class ProjectDetailPage {
    public readonly namespaceId = input.required<string>();

    public readonly id = input.required<string>();

    public readonly tab = input.required<string>();
}
