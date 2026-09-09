import type { ServiceVariableOrigin } from '@gitpaas/contracts';

/**
 * A variable of a service is one name and one value that the containers of the service read when its stack starts.
 */
export interface ServiceVariable {
    id: string;
    serviceId: string;
    name: string;
    secret: boolean;
    value: string | null;
    valueSet: boolean;
}

/**
 * A variable of a service as the row stores it: the value of a secret is still sealed.
 */
export interface StoredServiceVariable {
    name: string;
    secret: boolean;
    storedValue: string;
}

/**
 * A row of the list of the variables of a service: a row of the table, a name of the compose file, or both.
 */
export interface ServiceVariableRow {
    id: string | null;
    serviceId: string;
    name: string;
    secret: boolean;
    value: string | null;
    valueSet: boolean;
    origin: ServiceVariableOrigin;
    composeRefreshedAt: Date | null;
}
