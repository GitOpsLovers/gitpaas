import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import type { Profile } from '@gitpaas/contracts';

import { buildAccountInitialsUseCase } from '../../../application/build-account-initials.use-case';

import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';

/**
 * Name shown when the account carries no display name of its own.
 */
const UNNAMED = 'No display name';

@Component({
    selector: 'app-profile-account-card',
    templateUrl: './profile-account-card.component.html',
    imports: [DatePipe, ComponentCardComponent],
})

/**
 * Card of the account, which shows the avatar, the display name, the address, the role and the date of creation.
 */
export class ProfileAccountCardComponent {
    /**
     * Account of the user of the token.
     */
    public readonly profile = input.required<Profile>();

    /**
     * Letters of the avatar, from the display name, or from the email address.
     */
    protected readonly initials = computed(
        () => buildAccountInitialsUseCase(this.profile().displayName, this.profile().email),
    );

    /**
     * Name shown beside the avatar, and a stand-in when the account carries none.
     */
    protected readonly name = computed(() => this.profile().displayName ?? UNNAMED);

    /**
     * States that the account carries a display name of its own.
     */
    protected readonly named = computed(() => this.profile().displayName !== null);
}
