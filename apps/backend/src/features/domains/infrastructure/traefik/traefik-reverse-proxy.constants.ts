/**
 * The external network the proxy watches, which every routed stack joins.
 */
export const PROXY_NETWORK = 'gitpaas-proxy';

/**
 * The resolver of Let's Encrypt the proxy declares, and the key of its entry in the store of ACME.
 */
export const ACME_RESOLVER = 'letsencrypt';

/**
 * Where the store of ACME sits when the operator gives no `PROXY_ACME_PATH`.
 */
export const DEFAULT_ACME_STORE_PATH = '/acme/acme.json';

/**
 * The count of the characters of the id that a name of a router carries.
 */
export const ROUTER_NAME_ID_LENGTH = 8;

/**
 * The context every log line of the proxy carries.
 */
export const PROXY_CONTEXT = 'ReverseProxy';
