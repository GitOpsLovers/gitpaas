import { Component } from '@angular/core';

import { ServiceEditComponent } from '@features/services/ui/containers/service-edit/service-edit.component';

@Component({
    selector: 'app-service-edit-page',
    templateUrl: './service-edit.component.html',
    imports: [ServiceEditComponent],
})

/**
 * Edit service page.
 */
export class ServicesEditPage {}
