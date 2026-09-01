import type { RuntimeLogLine } from '@gitpaas/contracts';
import { Observable } from 'rxjs';

import { RuntimeLogReadOptions } from '../models/runtime-log.models';

/**
 * Store of the output of the containers that run, keyed by the identifier of the container.
 */
export interface RuntimeLogStore {
    /**
     * Take one line of the output of a container: publish it live, and hold it for the next write.
     *
     * @param containerId Identifier of the container the line comes from
     * @param line Line of the output of that container
     */
    append: (containerId: string, line: RuntimeLogLine) => void;

    /**
     * Read the output a container already wrote, the lines that wait for the next write included.
     *
     * @param containerId Identifier of the container
     * @param options How many lines the read takes, and the instant it starts at
     *
     * @returns Ordered lines of the output of that container
     */
    read: (containerId: string, options?: RuntimeLogReadOptions) => Promise<RuntimeLogLine[]>;

    /**
     * Stream the lines a container writes from now on.
     *
     * @param containerId Identifier of the container
     *
     * @returns Hot observable that ends when the container stops
     */
    stream: (containerId: string) => Observable<RuntimeLogLine>;

    /**
     * End the live stream of a container that stopped.
     *
     * @param containerId Identifier of the container
     */
    close: (containerId: string) => void;

    /**
     * Write the lines that wait, whatever the size and the age of the batch are.
     */
    flush: () => Promise<void>;
}
