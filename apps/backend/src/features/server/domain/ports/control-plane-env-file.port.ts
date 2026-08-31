/**
 * Writer of the domain of the control plane into the environment of the stack.
 */
export interface ControlPlaneEnvFile {
    /**
     * Writes the domain of the control plane into every variable that carries it.
     *
     * @param domain Host name the control plane answers on
     */
    writeDomain: (domain: string) => Promise<void>;
}
