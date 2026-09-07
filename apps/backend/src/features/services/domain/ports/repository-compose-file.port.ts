/**
 * Port that reads the Compose file a repository of a provider carries.
 */
export interface RepositoryComposeFile {
    /**
     * Reads one file of an archive of a repository.
     *
     * @param archive Gzipped tarball of the repository
     * @param composePath Path of the Compose file inside the repository
     *
     * @returns The text of the file, or `null` when the archive carries no such file
     */
    read: (archive: Buffer, composePath: string) => Promise<string | null>;
}
