import { readFile } from 'node:fs/promises';

import { ConfigService } from '@nestjs/config';

import { Domain } from '../../../domain/models/domain.models';
import { TraefikReverseProxyAdapter } from '../traefik-reverse-proxy.adapter';

import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }));

/**
 * Reader of the store of ACME, mocked so an unreadable store can be exercised.
 */
const mockReadFile = readFile as unknown as jest.MockedFunction<(path: string, encoding: string) => Promise<string>>;

describe('TraefikReverseProxyAdapter', () => {
    const acmePath = '/acme/acme.json';

    let mockLogger: jest.Mocked<Pick<NestLoggerAdapter, 'warn'>>;
    let sut: TraefikReverseProxyAdapter;

    /** Builds a domain fixture, overriding only the fields under test. */
    const domain = (overrides: Partial<Domain> = {}): Domain => ({
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        serviceId: 'f0e1d2c3-b4a5-4968-8778-695a4b3c2d1e',
        host: 'app.example.com',
        targetService: 'web',
        port: 8080,
        https: false,
        certificateState: 'none',
        certificateError: null,
        ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = { warn: jest.fn() };
        sut = new TraefikReverseProxyAdapter(
            mockLogger as unknown as NestLoggerAdapter,
            { get: jest.fn(() => acmePath) } as unknown as ConfigService,
        );
    });

    describe('buildRouting', () => {
        it('returns no routing when the service holds no domain', () => {
            expect(sut.buildRouting([])).toEqual({});
        });

        it('routes a domain of HTTP on the plain entrypoint alone', () => {
            const labels = sut.buildRouting([domain()]);

            expect(labels).toEqual({
                web: {
                    'traefik.enable': 'true',
                    'traefik.docker.network': 'gitpaas-proxy',
                    'traefik.http.services.app-example-com-a1b2c3d4.loadbalancer.server.port': '8080',
                    'traefik.http.routers.app-example-com-a1b2c3d4.rule': 'Host(`app.example.com`)',
                    'traefik.http.routers.app-example-com-a1b2c3d4.service': 'app-example-com-a1b2c3d4',
                    'traefik.http.routers.app-example-com-a1b2c3d4.entrypoints': 'web',
                },
            });
        });

        it('routes a domain of HTTPS on the secure entrypoint, and sends the plain one to it', () => {
            const labels = sut.buildRouting([domain({ https: true, certificateState: 'pending' })]);

            expect(labels).toEqual({
                web: {
                    'traefik.enable': 'true',
                    'traefik.docker.network': 'gitpaas-proxy',
                    'traefik.http.services.app-example-com-a1b2c3d4.loadbalancer.server.port': '8080',
                    'traefik.http.routers.app-example-com-a1b2c3d4.rule': 'Host(`app.example.com`)',
                    'traefik.http.routers.app-example-com-a1b2c3d4.service': 'app-example-com-a1b2c3d4',
                    'traefik.http.routers.app-example-com-a1b2c3d4.entrypoints': 'websecure',
                    'traefik.http.routers.app-example-com-a1b2c3d4.tls.certresolver': 'letsencrypt',
                    'traefik.http.routers.app-example-com-a1b2c3d4-http.rule': 'Host(`app.example.com`)',
                    'traefik.http.routers.app-example-com-a1b2c3d4-http.entrypoints': 'web',
                    'traefik.http.routers.app-example-com-a1b2c3d4-http.middlewares': 'app-example-com-a1b2c3d4-https',
                    'traefik.http.routers.app-example-com-a1b2c3d4-http.service': 'app-example-com-a1b2c3d4',
                    'traefik.http.middlewares.app-example-com-a1b2c3d4-https.redirectscheme.scheme': 'https',
                    'traefik.http.middlewares.app-example-com-a1b2c3d4-https.redirectscheme.permanent': 'true',
                },
            });
        });

        it('groups several domains under the compose service each one names', () => {
            const labels = sut.buildRouting([
                domain(),
                domain({ id: '11111111-2222-4333-8444-555555555555', host: 'admin.example.com', port: 9000 }),
                domain({
                    id: '99999999-8888-4777-8666-555555555555',
                    host: 'api.example.com',
                    targetService: 'api',
                    port: 3000,
                }),
            ]);

            expect(Object.keys(labels).sort()).toEqual(['api', 'web']);
            expect(labels.web).toMatchObject({
                'traefik.http.routers.app-example-com-a1b2c3d4.rule': 'Host(`app.example.com`)',
                'traefik.http.services.app-example-com-a1b2c3d4.loadbalancer.server.port': '8080',
                'traefik.http.routers.admin-example-com-11111111.rule': 'Host(`admin.example.com`)',
                'traefik.http.services.admin-example-com-11111111.loadbalancer.server.port': '9000',
            });
            expect(labels.api).toEqual({
                'traefik.enable': 'true',
                'traefik.docker.network': 'gitpaas-proxy',
                'traefik.http.services.api-example-com-99999999.loadbalancer.server.port': '3000',
                'traefik.http.routers.api-example-com-99999999.rule': 'Host(`api.example.com`)',
                'traefik.http.routers.api-example-com-99999999.service': 'api-example-com-99999999',
                'traefik.http.routers.api-example-com-99999999.entrypoints': 'web',
            });
        });
    });

    describe('getCertificateStates', () => {
        it('never reads the store when no host is asked for', async () => {
            await expect(sut.getCertificateStates([])).resolves.toEqual(new Map());

            expect(mockReadFile).not.toHaveBeenCalled();
        });

        it('reports a host the store holds, main or alternative, as ready', async () => {
            mockReadFile.mockResolvedValue(
                JSON.stringify({
                    letsencrypt: {
                        Certificates: [
                            { domain: { main: 'app.example.com' } },
                            { domain: { main: 'api.example.com', sans: ['admin.example.com'] } },
                        ],
                    },
                }),
            );

            const states = await sut.getCertificateStates([
                'app.example.com',
                'admin.example.com',
                'shop.example.com',
            ]);

            expect(mockReadFile).toHaveBeenCalledWith(acmePath, 'utf8');
            expect(states).toEqual(
                new Map([
                    ['app.example.com', 'ready'],
                    ['admin.example.com', 'ready'],
                    ['shop.example.com', 'pending'],
                ]),
            );
        });

        it('reports every host as pending when the resolver holds no certificate yet', async () => {
            mockReadFile.mockResolvedValue(JSON.stringify({ letsencrypt: { Certificates: null } }));

            await expect(sut.getCertificateStates(['app.example.com'])).resolves.toEqual(
                new Map([['app.example.com', 'pending']]),
            );
        });

        it('reports no state and warns when the store cannot be read', async () => {
            mockReadFile.mockRejectedValue(new Error('ENOENT'));

            await expect(sut.getCertificateStates(['app.example.com'])).resolves.toEqual(new Map());

            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        });
    });
});
