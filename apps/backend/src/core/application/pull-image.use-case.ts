import type { ContainerRuntime } from '../domain/ports/container-runtime.port';

/**
 * Pulls an image from its registry, and waits for the end of the pull.
 *
 * @param runtime Container runtime port
 * @param reference Image reference to pull
 *
 * @throws Error When the pull ended with a failure
 */
export async function pullImageUseCase(runtime: ContainerRuntime, reference: string): Promise<void> {
    const stream = await runtime.pullImage(reference);

    await new Promise<void>((resolvePromise, reject) => {
        runtime.followProgress(
            stream,
            (error) => {
                if (error) {
                    reject(error instanceof Error ? error : new Error(JSON.stringify(error)));

                    return;
                }

                resolvePromise();
            },
            () => {
                // The progress of the pull interests no caller: it reports its own lines.
            },
        );
    });
}
