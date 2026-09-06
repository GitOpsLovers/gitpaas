import type { RuntimeSelector } from '@core/domain/models/container-runtime.models';

/**
 * The selector of a listing that reads the whole Docker host, and that filters no resource out.
 */
export const HOST_SELECTOR: RuntimeSelector = { host: true };
