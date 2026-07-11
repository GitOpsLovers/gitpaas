import { Component, input } from '@angular/core';

import { ServiceDetailComponent } from '@features/services/ui/containers/service-detail/service-detail.component';

@Component({
    selector: 'app-service-detail-page',
    templateUrl: './service-detail.component.html',
    imports: [ServiceDetailComponent],
})

/**
 * Service detail page component
 */
export class ServiceDetailPage {
    public readonly id = input.required<string>();

    public readonly serviceId = input.required<string>();

    public readonly tab = input.required<string>();
}
