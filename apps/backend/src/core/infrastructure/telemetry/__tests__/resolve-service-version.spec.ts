import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resetServiceVersionCache, resolveServiceVersion } from '../resolve-service-version';

jest.mock('node:fs', () => ({
    ...jest.requireActual<typeof import('node:fs')>('node:fs'),
    readFileSync: jest.fn(jest.requireActual<typeof import('node:fs')>('node:fs').readFileSync),
}));

/**
 * Reader of the manifests, mocked so unreadable roots can be exercised.
 */
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

/**
 * Version declared by the root manifest of the monorepo.
 */
const rootPackageVersion = (
    JSON.parse(jest.requireActual<typeof import('node:fs')>('node:fs').readFileSync(join(__dirname, '../../../../../../..', 'package.json'), 'utf8')) as {
        version: string;
    }
).version;

describe('resolveServiceVersion', () => {
    let envBackup: NodeJS.ProcessEnv;

    beforeEach(() => {
        envBackup = { ...process.env };
        resetServiceVersionCache();
    });

    afterEach(() => {
        process.env = envBackup;
        resetServiceVersionCache();
        mockReadFileSync.mockImplementation(jest.requireActual<typeof import('node:fs')>('node:fs').readFileSync);
    });

    it('reports the version the build stamped the process with', () => {
        process.env.APP_VERSION = '1.4.2';

        expect(resolveServiceVersion()).toBe('1.4.2');
    });

    it('ignores an empty stamped version and reads the root manifest of the monorepo', () => {
        process.env.APP_VERSION = '';

        expect(resolveServiceVersion()).toBe(rootPackageVersion);
    });

    it('keeps a whitespace-only stamped version verbatim, without trimming it', () => {
        process.env.APP_VERSION = '   ';

        expect(resolveServiceVersion()).toBe('   ');
    });

    it('reads the root manifest of the monorepo when no build stamped a version', () => {
        delete process.env.APP_VERSION;

        expect(resolveServiceVersion()).toBe(rootPackageVersion);
    });

    it('reports the version the root manifest declares rather than a hard-coded one', () => {
        delete process.env.APP_VERSION;
        mockReadFileSync.mockReturnValue(JSON.stringify({ name: '@gitopslovers/gitpaas', version: '7.3.1-rc.4' }));

        expect(resolveServiceVersion()).toBe('7.3.1-rc.4');
    });

    it('resolves the version once and reuses it', () => {
        process.env.APP_VERSION = '1.4.2';

        expect(resolveServiceVersion()).toBe('1.4.2');

        process.env.APP_VERSION = '9.9.9';

        expect(resolveServiceVersion()).toBe('1.4.2');
    });

    it('reads the manifests once and serves every later call from the cache', () => {
        delete process.env.APP_VERSION;

        expect(resolveServiceVersion()).toBe(rootPackageVersion);

        const readsWhileResolving = mockReadFileSync.mock.calls.length;

        expect(resolveServiceVersion()).toBe(rootPackageVersion);
        expect(mockReadFileSync).toHaveBeenCalledTimes(readsWhileResolving);
    });

    it('resolves again once the cache is dropped', () => {
        process.env.APP_VERSION = '1.4.2';

        expect(resolveServiceVersion()).toBe('1.4.2');

        resetServiceVersionCache();
        process.env.APP_VERSION = '9.9.9';

        expect(resolveServiceVersion()).toBe('9.9.9');
    });

    it('caches the unknown fallback instead of retrying unreadable manifests', () => {
        delete process.env.APP_VERSION;
        mockReadFileSync.mockImplementation(() => {
            throw new Error('unreadable');
        });

        expect(resolveServiceVersion()).toBe('unknown');

        const readsWhileResolving = mockReadFileSync.mock.calls.length;

        expect(resolveServiceVersion()).toBe('unknown');
        expect(mockReadFileSync).toHaveBeenCalledTimes(readsWhileResolving);
    });

    it('falls back to the unknown version when no manifest can be read', () => {
        delete process.env.APP_VERSION;
        mockReadFileSync.mockImplementation(() => {
            throw new Error('unreadable');
        });

        expect(resolveServiceVersion()).toBe('unknown');
    });

    it('falls back to the unknown version when the manifest is not valid JSON', () => {
        delete process.env.APP_VERSION;
        mockReadFileSync.mockReturnValue('not json');

        expect(resolveServiceVersion()).toBe('unknown');
    });

    it('falls back to the unknown version when the manifest is not an object', () => {
        delete process.env.APP_VERSION;
        mockReadFileSync.mockReturnValue('null');

        expect(resolveServiceVersion()).toBe('unknown');
    });

    it('falls back to the unknown version when no manifest up to the filesystem root is the root one', () => {
        delete process.env.APP_VERSION;
        mockReadFileSync.mockReturnValue(JSON.stringify({ name: '@gitopslovers/gitpaas/backend', version: '1.4.2' }));

        expect(resolveServiceVersion()).toBe('unknown');
    });

    it('falls back to the unknown version when the root manifest declares no usable version', () => {
        delete process.env.APP_VERSION;
        mockReadFileSync.mockReturnValue(JSON.stringify({ name: '@gitopslovers/gitpaas', version: '' }));

        expect(resolveServiceVersion()).toBe('unknown');
    });

    it('falls back to the unknown version when the version of the root manifest is not a string', () => {
        delete process.env.APP_VERSION;
        mockReadFileSync.mockReturnValue(JSON.stringify({ name: '@gitopslovers/gitpaas', version: 42 }));

        expect(resolveServiceVersion()).toBe('unknown');
    });

    it('stops walking at the filesystem root instead of looping forever', () => {
        delete process.env.APP_VERSION;
        mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'unrelated' }));

        expect(resolveServiceVersion()).toBe('unknown');
        expect(mockReadFileSync.mock.calls.length).toBeGreaterThan(1);
    });
});
