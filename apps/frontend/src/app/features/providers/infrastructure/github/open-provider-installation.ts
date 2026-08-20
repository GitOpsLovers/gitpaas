/**
 * Sends the browser to the screen of GitHub that installs the new App.
 *
 * @param document Document whose address is changed
 * @param appSlug Short name GitHub gave the application
 * @param state State of the registration, so that the return names it back
 */
export function openProviderInstallation(document: Document, appSlug: string, state: string): void {
    const url = `https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new`
        + `?state=${encodeURIComponent(state)}`;

    document.location.assign(url);
}
