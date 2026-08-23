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
