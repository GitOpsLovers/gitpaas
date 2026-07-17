import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';

import { DockerClient } from '../docker.client';

// `node:fs` is mocked so `readFileSync` never touches the filesystem; the TLS
// certificate reads are controlled per-test to drive both the success and the
// "certs missing" failure branch of `createClient()`.
jest.mock('node:fs', () => ({ readFileSync: jest.fn() }));

// `dockerode` is replaced by a `jest.fn()` constructor so `new Docker(...)` never
// opens a real connection; we assert the exact options passed to it.
jest.mock('dockerode', () => jest.fn());

const readFileSyncMock = readFileSync as unknown as jest.Mock;
const DockerMock = Docker as unknown as jest.Mock;

/** Build a stub `ConfigService` whose `get` returns the provided values (falling back to the default). */
const createConfig = (values: Record<string, unknown> = {}): ConfigService =>
    ({
        get: jest.fn((key: string, defaultValue?: unknown) => (key in values ? values[key] : defaultValue)),
    }) as unknown as ConfigService;

describe('DockerClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        readFileSyncMock.mockImplementation((path: string) => Buffer.from(`bytes:${path}`));
    });

    describe('getClient', () => {
        it('reads the TLS certificates and constructs a Docker client with the configured connection options', () => {
            const client = new DockerClient(
                createConfig({
                    VPS_DOCKER_HOST: '10.0.0.5',
                    VPS_DOCKER_PORT: 4242,
                    VPS_DOCKER_CERT_PATH: '/certs',
                }),
            );

            const result = client.getClient();

            expect(readFileSyncMock).toHaveBeenCalledWith(join('/certs', 'ca.pem'));
            expect(readFileSyncMock).toHaveBeenCalledWith(join('/certs', 'cert.pem'));
            expect(readFileSyncMock).toHaveBeenCalledWith(join('/certs', 'key.pem'));

            expect(DockerMock).toHaveBeenCalledTimes(1);
            expect(DockerMock).toHaveBeenCalledWith({
                protocol: 'https',
                host: '10.0.0.5',
                port: 4242,
                ca: Buffer.from(`bytes:${join('/certs', 'ca.pem')}`),
                cert: Buffer.from(`bytes:${join('/certs', 'cert.pem')}`),
                key: Buffer.from(`bytes:${join('/certs', 'key.pem')}`),
            });
            expect(result).toBe(DockerMock.mock.instances[0]);
        });

        it('coerces a string port from config into a number', () => {
            const client = new DockerClient(
                createConfig({
                    VPS_DOCKER_HOST: '10.0.0.5',
                    VPS_DOCKER_PORT: '5000',
                    VPS_DOCKER_CERT_PATH: '/certs',
                }),
            );

            client.getClient();

            expect(DockerMock).toHaveBeenCalledWith(expect.objectContaining({ port: 5000 }));
        });

        it('memoizes the client, building Docker only once across calls', () => {
            const client = new DockerClient(createConfig({ VPS_DOCKER_CERT_PATH: '/certs' }));

            const first = client.getClient();
            const second = client.getClient();

            expect(first).toBe(second);
            expect(DockerMock).toHaveBeenCalledTimes(1);
            // Certificates are read only for the single client creation.
            expect(readFileSyncMock).toHaveBeenCalledTimes(3);
        });

        it('throws ServiceUnavailableException and never builds a client when the certificates cannot be read', () => {
            readFileSyncMock.mockImplementation(() => {
                throw new Error('ENOENT');
            });
            const client = new DockerClient(createConfig({ VPS_DOCKER_CERT_PATH: '/missing' }));

            expect(() => client.getClient()).toThrow(ServiceUnavailableException);
            expect(() => client.getClient()).toThrow('/missing');
            expect(DockerMock).not.toHaveBeenCalled();
        });

        it('re-attempts client creation after a failed read (does not memoize the failure)', () => {
            readFileSyncMock.mockImplementationOnce(() => {
                throw new Error('ENOENT');
            });
            const client = new DockerClient(createConfig({ VPS_DOCKER_CERT_PATH: '/certs' }));

            expect(() => client.getClient()).toThrow(ServiceUnavailableException);

            const result = client.getClient();

            expect(result).toBe(DockerMock.mock.instances[0]);
            expect(DockerMock).toHaveBeenCalledTimes(1);
        });
    });
});
