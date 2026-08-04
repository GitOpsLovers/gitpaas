/**
 * Minimal shape a project name can be derived from. Vendor-free: only the
 * identity fields the derivation reads, never a persistence or client type.
 */
export interface ProjectSource {
    id: string;
    name: string;
}
