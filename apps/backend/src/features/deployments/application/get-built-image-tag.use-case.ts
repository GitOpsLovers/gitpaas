/**
 * Use case for building the tag a locally built image of a stack carries on the daemon.
 *
 * @param composeProjectName Name of the Compose project of the service
 * @param serviceId Identifier of the service the image belongs to
 * @param composeServiceName Name the recipe gives to the Compose service that declares the build
 *
 * @returns Tag of the built image on the daemon
 */
export function getBuiltImageTagUseCase(composeProjectName: string, serviceId: string, composeServiceName: string): string {
    return `${composeProjectName}_${serviceId}_${composeServiceName}`;
}
