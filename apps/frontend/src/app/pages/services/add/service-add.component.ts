import { Component } from '@angular/core';

import { ServiceAddComponent } from '@features/services/ui/containers/service-add/service-add.component';

@Component({
    selector: 'app-service-add-page',
    templateUrl: './service-add.component.html',
    imports: [ServiceAddComponent],
})

/**
 * Create service page.
 */
export class ServicesAddPage {}
