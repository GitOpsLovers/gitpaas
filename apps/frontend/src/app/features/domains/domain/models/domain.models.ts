/**
 * The values the form of the tab of the domains holds while the user writes one domain.
 */
export interface DomainDraft {
    host: string;
    targetService: string;
    port: number;
    https: boolean;
}
