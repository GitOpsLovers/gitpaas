import { Component } from '@angular/core';

import { SigninComponent } from '@features/authentication/ui/containers/signin/signin.component';

/**
 * Full-screen sign-in page. Rendered outside the app shell (no sidebar/header).
 *
 * Holds only the page-level chrome — the centered layout wrapper and the
 * Artifactory branding — and delegates the login flow to {@link SigninComponent}.
 */
@Component({
    selector: 'app-signin',
    templateUrl: './signin.component.html',
    imports: [SigninComponent],
})
export class SigninPage {}
