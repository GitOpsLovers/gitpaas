/**
 * The values the form of the tab of the configuration holds while the user writes one variable.
 */
export interface ServiceVariableDraft {
    name: string;
    value: string;
    secret: boolean;
}
