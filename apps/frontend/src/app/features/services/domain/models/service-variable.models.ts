/**
 * The values the form of the tab of the environment holds while the user writes one variable.
 */
export interface ServiceVariableDraft {
    name: string;
    value: string;
    secret: boolean;
}
