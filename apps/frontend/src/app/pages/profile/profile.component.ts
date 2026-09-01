import { Component } from '@angular/core';

import { ProfileOverviewComponent } from '@features/profile/ui/containers/profile-overview/profile-overview.component';

@Component({
    selector: 'app-profile-page',
    templateUrl: './profile.component.html',
    imports: [ProfileOverviewComponent],
})

/**
 * Profile page.
 */
export class ProfilePage {}
