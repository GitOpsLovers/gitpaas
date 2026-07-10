import { Component } from '@angular/core';

import { ServiceDetailComponent } from '@features/services/ui/containers/service-detail/service-detail.component';

@Component({
    selector: 'app-service-detail-page',
    templateUrl: './service-detail.component.html',
    imports: [ServiceDetailComponent],
})

/**
 * Service detail page.
 */
export class ServiceDetailPage {}
