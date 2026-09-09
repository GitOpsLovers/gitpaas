/**
 * The names and the literal values of the key `environment` of the compose file of a service, as GitPaaS last read them.
 */
export interface ComposeEnvironmentCache {
    /**
     * The literal value of every name the compose file declares, keyed by name. A name of a value `${VAR}` holds an empty value.
     */
    variables: Record<string, string>;

    /**
     * The moment GitPaaS last read the compose file of the service.
     */
    refreshedAt: Date;
}
