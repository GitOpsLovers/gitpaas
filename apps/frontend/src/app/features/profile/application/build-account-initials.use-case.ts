/**
 * Characters that separate the words of a display name or of the local part of an email address.
 */
const SEPARATORS = /[\s._-]+/;

/**
 * The greatest count of the letters that an avatar shows.
 */
const MAX_INITIALS = 2;

/**
 * Letters the avatar shows when the account carries neither a display name nor a readable address.
 */
const FALLBACK_INITIALS = '?';

/**
 * Builds the letters of the avatar of an account, from its display name, or from its email address.
 *
 * @param displayName Display name of the account, which the user may have left empty
 * @param email Email address of the account
 *
 * @returns One or two letters in upper case
 */
export function buildAccountInitialsUseCase(displayName: string | null, email: string): string {
    const named = displayName !== null && displayName.trim().length > 0;
    const source = named ? displayName.trim() : (email.split('@')[0] ?? '');

    const initials = source
        .split(SEPARATORS)
        .filter((word) => word.length > 0)
        .slice(0, MAX_INITIALS)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');

    return initials.length === 0 ? FALLBACK_INITIALS : initials;
}
