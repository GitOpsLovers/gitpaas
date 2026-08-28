/**
 * Loads the page again, so that the browser reads the assets of the new version.
 *
 * @param document Document whose page is loaded again
 */
export function reloadPage(document: Document): void {
    document.location.reload();
}
