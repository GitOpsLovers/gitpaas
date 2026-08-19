/**
 * Number of random bytes the state of a registration carries.
 */
export const PROVIDER_REGISTRATION_STATE_BYTES = 32;

/**
 * Life of a pending registration, in milliseconds: twelve hours from its creation.
 */
export const PROVIDER_REGISTRATION_LIFETIME_MS = 12 * 60 * 60 * 1000;

/**
 * Address of GitHub that creates an application on the account of the operator.
 */
export const GITHUB_PERSONAL_APP_CREATION_URL = 'https://github.com/settings/apps/new';

/**
 * Address of GitHub that creates an application on an organization. The login of
 * the organization takes the place of `{login}`.
 */
export const GITHUB_ORGANIZATION_APP_CREATION_URL_TEMPLATE = 'https://github.com/organizations/{login}/settings/apps/new';

/**
 * Path of the screen GitHub sends the browser back to after the creation of the application.
 */
export const PROVIDER_REGISTRATION_REDIRECT_PATH = '/providers/registrations/created';

/**
 * Path of the screen GitHub sends the browser back to after the installation of the application.
 */
export const PROVIDER_REGISTRATION_SETUP_PATH = '/providers/registrations/installed';
