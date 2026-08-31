/* eslint-disable no-secrets/no-secrets */
import { readFile, writeFile } from 'node:fs/promises';

import { CONTROL_PLANE_ENV_PATH } from '../../../domain/constants/platform-settings.constants';
import { FileControlPlaneEnvAdapter } from '../file-control-plane-env.adapter';

jest.mock('node:fs/promises', () => ({ readFile: jest.fn(), writeFile: jest.fn() }));

/**
 * Reader of the file of the environment, mocked so a given content can be exercised.
 */
const mockReadFile = readFile as unknown as jest.MockedFunction<(path: string, encoding: string) => Promise<string>>;

/**
 * Writer of the file of the environment, mocked so the content it receives can be read back.
 */
const mockWriteFile = writeFile as unknown as jest.MockedFunction<
    (path: string, content: string, encoding: string) => Promise<void>
>;

describe('FileControlPlaneEnvAdapter', () => {
    let sut: FileControlPlaneEnvAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockWriteFile.mockResolvedValue();
        sut = new FileControlPlaneEnvAdapter();
    });

    /** Returns the content the adapter wrote into the file of the environment. */
    const written = (): string => mockWriteFile.mock.calls[0][1];

    describe('writeDomain', () => {
        it('reads the file of the environment of the installation', async () => {
            mockReadFile.mockResolvedValue('CONTROL_PLANE_DOMAIN=\n');

            await sut.writeDomain('gitpaas.example.com');

            expect(mockReadFile).toHaveBeenCalledTimes(1);
            expect(mockReadFile).toHaveBeenCalledWith(CONTROL_PLANE_ENV_PATH, 'utf8');
        });

        it('writes the file of the environment back in place', async () => {
            mockReadFile.mockResolvedValue('CONTROL_PLANE_DOMAIN=\n');

            await sut.writeDomain('gitpaas.example.com');

            expect(mockWriteFile).toHaveBeenCalledTimes(1);
            expect(mockWriteFile).toHaveBeenCalledWith(CONTROL_PLANE_ENV_PATH, expect.any(String), 'utf8');
        });

        it('rewrites the four variables that carry the domain', async () => {
            mockReadFile.mockResolvedValue([
                'CONTROL_PLANE_DOMAIN=old.example.com',
                'CONTROL_PLANE_PROXY=false',
                'CORS_ORIGIN=http://192.0.2.5:8080',
                'APP_BASE_URL=http://192.0.2.5:8080',
                '',
            ].join('\n'));

            await sut.writeDomain('gitpaas.example.com');

            expect(written()).toBe([
                'CONTROL_PLANE_DOMAIN=gitpaas.example.com',
                'CONTROL_PLANE_PROXY=true',
                'CORS_ORIGIN=https://gitpaas.example.com',
                'APP_BASE_URL=https://gitpaas.example.com',
                '',
            ].join('\n'));
        });

        it('keeps every other line of the file, its comments and its order', async () => {
            mockReadFile.mockResolvedValue([
                '# The stack of GitPaaS',
                'POSTGRES_PASSWORD=a-secret',
                '',
                'CONTROL_PLANE_DOMAIN=old.example.com',
                'CONTROL_PLANE_PROXY=false',
                'LETSENCRYPT_EMAIL=ops@example.com',
                'CORS_ORIGIN=http://192.0.2.5:8080',
                'APP_BASE_URL=http://192.0.2.5:8080',
                'IMAGE_TAG=v2.1.0',
                '',
            ].join('\n'));

            await sut.writeDomain('gitpaas.example.com');

            expect(written()).toBe([
                '# The stack of GitPaaS',
                'POSTGRES_PASSWORD=a-secret',
                '',
                'CONTROL_PLANE_DOMAIN=gitpaas.example.com',
                'CONTROL_PLANE_PROXY=true',
                'LETSENCRYPT_EMAIL=ops@example.com',
                'CORS_ORIGIN=https://gitpaas.example.com',
                'APP_BASE_URL=https://gitpaas.example.com',
                'IMAGE_TAG=v2.1.0',
                '',
            ].join('\n'));
        });

        it('appends a variable the file carries none of', async () => {
            mockReadFile.mockResolvedValue('POSTGRES_PASSWORD=a-secret\n');

            await sut.writeDomain('gitpaas.example.com');

            expect(written()).toBe([
                'POSTGRES_PASSWORD=a-secret',
                'CONTROL_PLANE_DOMAIN=gitpaas.example.com',
                'CONTROL_PLANE_PROXY=true',
                'CORS_ORIGIN=https://gitpaas.example.com',
                'APP_BASE_URL=https://gitpaas.example.com',
                '',
            ].join('\n'));
        });

        it('keeps a file that ends with no newline ending with no newline', async () => {
            mockReadFile.mockResolvedValue('POSTGRES_PASSWORD=a-secret');

            await sut.writeDomain('gitpaas.example.com');

            expect(written().endsWith('APP_BASE_URL=https://gitpaas.example.com')).toBe(true);
        });

        it('never comments out a line that only names a variable of the control plane', async () => {
            mockReadFile.mockResolvedValue('# CONTROL_PLANE_DOMAIN holds the domain of the panel\nCONTROL_PLANE_DOMAIN=old.example.com\n');

            await sut.writeDomain('gitpaas.example.com');

            expect(written()).toContain('# CONTROL_PLANE_DOMAIN holds the domain of the panel\nCONTROL_PLANE_DOMAIN=gitpaas.example.com\n');
        });

        it('rewrites a duplicate assignment of the same variable', async () => {
            mockReadFile.mockResolvedValue('CORS_ORIGIN=http://192.0.2.5:8080\nCORS_ORIGIN=http://localhost:8080\n');

            await sut.writeDomain('gitpaas.example.com');

            expect(written()).toBe([
                'CORS_ORIGIN=https://gitpaas.example.com',
                'CORS_ORIGIN=https://gitpaas.example.com',
                'CONTROL_PLANE_DOMAIN=gitpaas.example.com',
                'CONTROL_PLANE_PROXY=true',
                'APP_BASE_URL=https://gitpaas.example.com',
                '',
            ].join('\n'));
        });

        it('writes an empty file with the four variables alone', async () => {
            mockReadFile.mockResolvedValue('');

            await sut.writeDomain('gitpaas.example.com');

            expect(written()).toBe([
                'CONTROL_PLANE_DOMAIN=gitpaas.example.com',
                'CONTROL_PLANE_PROXY=true',
                'CORS_ORIGIN=https://gitpaas.example.com',
                'APP_BASE_URL=https://gitpaas.example.com',
                '',
            ].join('\n'));
        });

        it('propagates the failure of the read', async () => {
            const error = new Error('ENOENT');
            mockReadFile.mockRejectedValue(error);

            await expect(sut.writeDomain('gitpaas.example.com')).rejects.toThrow(error);
            expect(mockWriteFile).not.toHaveBeenCalled();
        });

        it('propagates the failure of the write', async () => {
            const error = new Error('EACCES');
            mockReadFile.mockResolvedValue('CONTROL_PLANE_DOMAIN=\n');
            mockWriteFile.mockRejectedValue(error);

            await expect(sut.writeDomain('gitpaas.example.com')).rejects.toThrow(error);
        });
    });
});
