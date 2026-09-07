/**
 * Where the Compose text of a service comes from.
 */
export type FinalComposeOrigin = 'deployment' | 'repository' | 'none';

/**
 * The final Compose file of a service, and the origin of its text.
 */
export interface FinalCompose {
    text: string | null;
    origin: FinalComposeOrigin;
}
