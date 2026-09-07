import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import * as tar from 'tar';

import { TarRepositoryComposeFileAdapter } from '../tar-repository-compose-file.adapter';

describe('TarRepositoryComposeFileAdapter', () => {
    const composeText = 'services:\n  web:\n    image: nginx\n';

    const nestedText = 'services:\n  worker:\n    image: node\n';

    let directory: string;
    let sut: TarRepositoryComposeFileAdapter;

    /**
     * Builds the gzipped tarball a provider answers: every file under the root folder of the
     * repository, as GitHub wraps it.
     */
    const archiveOf = async (files: Record<string, string>): Promise<Buffer> => {
        for (const [path, content] of Object.entries(files)) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            await mkdir(dirname(join(directory, path)), { recursive: true });
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            await writeFile(join(directory, path), content, 'utf8');
        }

        const chunks: Buffer[] = [];
        const pack = tar.c({ gzip: true, cwd: directory, prefix: 'gitpaas-abc123' }, Object.keys(files));

        for await (const chunk of pack) {
            chunks.push(Buffer.from(chunk as Uint8Array));
        }

        return Buffer.concat(chunks);
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        directory = await mkdtemp(join(tmpdir(), 'gitpaas-archive-spec-'));
        sut = new TarRepositoryComposeFileAdapter();
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it('returns the text of the Compose file the archive carries at the root of the repository', async () => {
        const archive = await archiveOf({ 'docker-compose.yml': composeText, 'README.md': '# repo' });

        await expect(sut.read(archive, 'docker-compose.yml')).resolves.toBe(composeText);
    });

    it('returns the text of a Compose file that lives in a folder of the repository', async () => {
        const archive = await archiveOf({ 'deploy/compose.yaml': nestedText });

        await expect(sut.read(archive, 'deploy/compose.yaml')).resolves.toBe(nestedText);
    });

    it('reads a path that carries a leading "./" of the repository', async () => {
        const archive = await archiveOf({ 'docker-compose.yml': composeText });

        await expect(sut.read(archive, './docker-compose.yml')).resolves.toBe(composeText);
    });

    it('returns null when the archive carries no file at that path', async () => {
        const archive = await archiveOf({ 'docker-compose.yml': composeText });

        await expect(sut.read(archive, 'deploy/compose.yaml')).resolves.toBeNull();
    });

    it('never answers the file of a different path that ends with the same name', async () => {
        const archive = await archiveOf({ 'deploy/docker-compose.yml': nestedText });

        await expect(sut.read(archive, 'docker-compose.yml')).resolves.toBeNull();
    });
});
