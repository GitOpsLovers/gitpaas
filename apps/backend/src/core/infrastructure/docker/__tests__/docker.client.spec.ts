import fs from 'node:fs';

import Docker from 'dockerode';

import { DockerClient } from '../docker.client';

// `dockerode` is replaced by a `jest.fn()` constructor so `new Docker(...)` never
// opens a real connection; we assert the exact options passed to it.
jest.mock('dockerode', () => jest.fn());

const DockerMock = Docker as unknown as jest.Mock;

describe('DockerClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getClient', () => {
        it('constructs a Docker client bound to the local unix socket', () => {
            const client = new DockerClient();

            const result = client.getClient();

            expect(DockerMock).toHaveBeenCalledTimes(1);
            expect(DockerMock).toHaveBeenCalledWith({ socketPath: '/var/run/docker.sock' });
            expect(result).toBe(DockerMock.mock.instances[0]);
        });

        it('passes the socket path as the only connection option', () => {
            new DockerClient().getClient();

            const [options] = DockerMock.mock.calls[0] as [Record<string, unknown>];

            expect(Object.keys(options)).toEqual(['socketPath']);
        });

        it('never reads TLS material from disk', () => {
            const readFileSync = jest.spyOn(fs, 'readFileSync');
            const existsSync = jest.spyOn(fs, 'existsSync');

            new DockerClient().getClient();

            expect(readFileSync).not.toHaveBeenCalled();
            expect(existsSync).not.toHaveBeenCalled();

            readFileSync.mockRestore();
            existsSync.mockRestore();
        });

        it('needs no injected dependencies to be constructed', () => {
            expect(DockerClient).toHaveLength(0);
            expect(() => new DockerClient().getClient()).not.toThrow();
        });

        it('memoizes the client, building Docker only once across calls', () => {
            const client = new DockerClient();

            const first = client.getClient();
            const second = client.getClient();

            expect(first).toBe(second);
            expect(DockerMock).toHaveBeenCalledTimes(1);
        });

        it('keeps one client per DockerClient instance', () => {
            const first = new DockerClient().getClient();
            const second = new DockerClient().getClient();

            expect(DockerMock).toHaveBeenCalledTimes(2);
            expect(first).not.toBe(second);
        });
    });
});
