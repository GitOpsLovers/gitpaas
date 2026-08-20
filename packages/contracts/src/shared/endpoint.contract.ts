/** The HTTP methods that the API of GitPaaS uses. */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Describes one endpoint of the API.
 */
export interface EndpointDescriptor<
    TParams = unknown,
    TQuery = unknown,
    TBody = unknown,
    TResponse = unknown,
> {
    readonly method: HttpMethod;
    readonly path: string;
    readonly params?: TParams;
    readonly query?: TQuery;
    readonly body?: TBody;
    readonly response: TResponse;
}

/** 
 * The descriptors of one feature, keyed by the name of the operation. 
 */
export type EndpointMap = Readonly<Record<string, EndpointDescriptor>>;
