import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { Injectable } from '@nestjs/common';
import * as tar from 'tar';

import type { RepositoryComposeFile } from '../../domain/ports/repository-compose-file.port';

/**
 * Drops the root folder a provider wraps the archive of a repository with.
 *
 * @param path Path of an entry of the archive
 *
 * @returns The path relative to the root of the repository
 */
const stripRoot = (path: string): string => path.split('/').slice(1).join('/');

/**
 * Gives the path of the Compose file the form the entries of the archive carry.
 *
 * @param composePath Path of the Compose file inside the repository
 *
 * @returns The path with no leading separator and no leading `./`
 */
const normalizePath = (composePath: string): string => composePath.replace(/^\.?\//, '');

/**
 * Adapter that reads the Compose file of a repository out of its tarball, with no write on the disk.
 */
@Injectable()
export class TarRepositoryComposeFileAdapter implements RepositoryComposeFile {
    public async read(archive: Buffer, composePath: string): Promise<string | null> {
        const wanted = normalizePath(composePath);
        const chunks: Buffer[] = [];

        await pipeline(
            Readable.from(archive),
            tar.t({
                filter: (path: string) => stripRoot(path) === wanted,
                onReadEntry: (entry) => {
                    entry.on('data', (chunk: Buffer) => chunks.push(chunk));
                },
            }),
        );

        return chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : null;
    }
}
