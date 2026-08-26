import { resolve } from 'node:path';

import {
    injectEnvironment,
    normalizeBuildArgs,
    normalizeHealthchecks,
    recipeServices,
    resolveBuild,
    stampLabels,
    stampRouting,
    toNanoseconds,
} from '../compose-recipe.transformer';

import type { RuntimeComposeProject } from '@core/domain/models/container-runtime.models';

/**
 * Casts a bare recipe fixture to the compose project shape the transformer reads
 * its recipe from (the runtime object carries it as an untyped property).
 */
const asCompose = (fixture: unknown): RuntimeComposeProject => fixture as RuntimeComposeProject;

describe('compose-recipe.transformer', () => {
    describe('toNanoseconds', () => {
        it('passes a raw number through unchanged (assumed nanoseconds)', () => {
            expect(toNanoseconds(42)).toBe(42);
        });

        it('returns 0 for a non-string/non-number value', () => {
            expect(toNanoseconds(undefined)).toBe(0);
        });

        it('parses second and millisecond durations', () => {
            expect(toNanoseconds('5s')).toBe(5e9);
            expect(toNanoseconds('500ms')).toBe(5e8);
        });

        it('sums compound durations and parses hours', () => {
            expect(toNanoseconds('1m30s')).toBe(90e9);
            expect(toNanoseconds('2h')).toBe(7200e9);
        });

        it('returns 0 for an unparseable string', () => {
            expect(toNanoseconds('abc')).toBe(0);
        });
    });

    describe('normalizeBuildArgs', () => {
        it('returns undefined when no args are given', () => {
            expect(normalizeBuildArgs(undefined)).toBeUndefined();
        });

        it('parses the list form, splitting on the first "=" and treating a bare key as empty', () => {
            const result = normalizeBuildArgs(['KEY=value', 'BARE', 'K=a=b']);

            expect(result).toEqual({ KEY: 'value', BARE: '', K: 'a=b' });
        });

        it('coerces map-form values to strings', () => {
            const result = normalizeBuildArgs({ A: 1, B: true });

            expect(result).toEqual({ A: '1', B: 'true' });
        });
    });

    describe('resolveBuild', () => {
        it('resolves the string shorthand against the base dir with a default Dockerfile', () => {
            const result = resolveBuild('app', '/repo');

            expect(result).toEqual({ contextPath: resolve('/repo', 'app'), dockerfile: 'Dockerfile' });
        });

        it('resolves the object form with context, dockerfile, args and target', () => {
            const result = resolveBuild(
                {
                    context: 'svc', dockerfile: 'Dockerfile.prod', args: ['X=1'], target: 'prod',
                },
                '/repo',
            );

            expect(result).toEqual({
                contextPath: resolve('/repo', 'svc'),
                dockerfile: 'Dockerfile.prod',
                buildargs: { X: '1' },
                target: 'prod',
            });
        });

        it('defaults the context to the base dir when none is given', () => {
            const result = resolveBuild({}, '/repo');

            expect(result.contextPath).toBe(resolve('/repo', '.'));
        });
    });

    describe('recipeServices', () => {
        it('returns the recipe services when present', () => {
            const services = { web: { image: 'nginx' } };

            expect(recipeServices(asCompose({ recipe: { services } }))).toBe(services);
        });

        it('returns an empty object when the recipe or its services are missing', () => {
            expect(recipeServices(asCompose({}))).toEqual({});
            expect(recipeServices(asCompose({ recipe: {} }))).toEqual({});
        });
    });

    describe('normalizeHealthchecks', () => {
        it('rewrites healthcheck durations to nanoseconds and leaves other services untouched', () => {
            const withCheck = { healthcheck: { interval: '5s', timeout: '2s' } as Record<string, unknown> };
            const withoutCheck = { image: 'nginx' } as { image: string; healthcheck?: unknown };
            const compose = { recipe: { services: { a: withCheck, b: withoutCheck } } };

            normalizeHealthchecks(asCompose(compose));

            expect(withCheck.healthcheck).toEqual({ interval: 5e9, timeout: 2e9, start_period: 0 });
            expect(withoutCheck.healthcheck).toBeUndefined();
        });
    });

    describe('stampLabels', () => {
        it('stamps the GitPaaS and compose labels on a service with no labels of its own', () => {
            const web = {} as { labels?: unknown };
            const compose = { recipe: { services: { web } } };

            stampLabels(asCompose(compose), 'my-project');

            expect(web.labels).toEqual([
                'io.gitpaas.managed=true',
                'io.gitpaas.project=my-project',
                'com.docker.compose.project=my-project',
                'com.docker.compose.service=web',
            ]);
        });

        it('merges into user-declared list-form labels instead of clobbering them', () => {
            const web = { labels: ['traefik.enable=true', 'bare'] } as { labels?: unknown };
            const compose = { recipe: { services: { web } } };

            stampLabels(asCompose(compose), 'my-project');

            expect(web.labels).toEqual([
                'traefik.enable=true',
                'bare=',
                'io.gitpaas.managed=true',
                'io.gitpaas.project=my-project',
                'com.docker.compose.project=my-project',
                'com.docker.compose.service=web',
            ]);
        });

        it('normalises user-declared map-form labels into the list form the library parses', () => {
            const web = { labels: { 'app.tier': 'edge', 'app.replicas': 2 } } as { labels?: unknown };
            const compose = { recipe: { services: { web } } };

            stampLabels(asCompose(compose), 'my-project');

            expect(web.labels).toEqual([
                'app.tier=edge',
                'app.replicas=2',
                'io.gitpaas.managed=true',
                'io.gitpaas.project=my-project',
                'com.docker.compose.project=my-project',
                'com.docker.compose.service=web',
            ]);
        });

        it('merges the GitPaaS labels as a map into top-level volumes and networks', () => {
            const compose = {
                recipe: {
                    services: {},
                    volumes: { data: null, cache: { labels: { keep: 'me' } } },
                    networks: { edge: null },
                },
            };

            stampLabels(asCompose(compose), 'my-project');

            const gitpaas = { 'io.gitpaas.managed': 'true', 'io.gitpaas.project': 'my-project' };
            expect(compose.recipe.volumes.data).toEqual({ labels: gitpaas });
            expect(compose.recipe.volumes.cache).toEqual({ labels: { keep: 'me', ...gitpaas } });
            expect(compose.recipe.networks.edge).toEqual({ labels: gitpaas });
        });

        it('does nothing when the recipe declares no services, volumes or networks', () => {
            expect(() => { stampLabels(asCompose({ recipe: {} }), 'my-project'); }).not.toThrow();
            expect(() => { stampLabels(asCompose({}), 'my-project'); }).not.toThrow();
        });
    });
    describe('stampRouting', () => {
        it('merges the labels of the routing into the labels the compose service already carries', () => {
            const compose = { recipe: { services: { web: { labels: ['app.tier=edge'] } } } };

            const stamped = stampRouting(asCompose(compose), { web: { 'traefik.enable': 'true' } });

            expect(stamped).toEqual(['web']);
            expect(compose.recipe.services.web.labels).toEqual(['app.tier=edge', 'traefik.enable=true']);
        });

        it('stamps each compose service the routing names, and leaves every other one untouched', () => {
            const compose = {
                recipe: {
                    services: {
                        web: {} as { labels?: unknown },
                        api: {} as { labels?: unknown },
                        cache: { image: 'redis:7' } as { labels?: unknown; image?: string },
                    },
                },
            };

            const stamped = stampRouting(asCompose(compose), {
                web: { 'traefik.enable': 'true' },
                api: { 'traefik.enable': 'true' },
            });

            expect(stamped).toEqual(['web', 'api']);
            expect(compose.recipe.services.cache).toEqual({ image: 'redis:7' });
        });

        it('skips a compose service the recipe lost, and reports the ones it stamped', () => {
            const compose = { recipe: { services: { web: {} as { labels?: unknown } } } };

            const stamped = stampRouting(asCompose(compose), {
                web: { 'traefik.enable': 'true' },
                worker: { 'traefik.enable': 'true' },
            });

            expect(stamped).toEqual(['web']);
        });

        it('stamps nothing when the service holds no domain', () => {
            const compose = { recipe: { services: { web: { image: 'nginx' } } } };

            expect(stampRouting(asCompose(compose), {})).toEqual([]);
            expect(compose.recipe.services.web).toEqual({ image: 'nginx' });
        });

        it('does nothing when the recipe declares no service', () => {
            expect(stampRouting(asCompose({}), { web: { 'traefik.enable': 'true' } })).toEqual([]);
        });
    });

    describe('injectEnvironment', () => {
        it('merges the variables into every service, in the KEY=value list form', () => {
            const web = { image: 'nginx' } as { image: string; environment?: unknown };
            const worker = { image: 'node', environment: { KEEP: 'me' } } as { image: string; environment?: unknown };
            const compose = { recipe: { services: { web, worker } } };

            injectEnvironment(asCompose(compose), { DATABASE_URL: 'postgres://db', API_TOKEN: 'the-token' });

            expect(web.environment).toEqual(['DATABASE_URL=postgres://db', 'API_TOKEN=the-token']);
            expect(worker.environment).toEqual([
                'KEEP=me',
                'DATABASE_URL=postgres://db',
                'API_TOKEN=the-token',
            ]);
        });

        it('lets a variable of the service override the value the compose file declares', () => {
            const compose = { recipe: { services: { web: { environment: ['PORT=8080'] } } } };

            injectEnvironment(asCompose(compose), { PORT: '9090' });

            expect(compose.recipe.services.web.environment).toEqual(['PORT=9090']);
        });

        it('leaves the recipe untouched when the service holds no variable', () => {
            const compose = { recipe: { services: { web: { image: 'nginx' } } } };

            injectEnvironment(asCompose(compose), {});

            expect(compose.recipe.services.web).toEqual({ image: 'nginx' });
        });

        it('does nothing when the recipe declares no service', () => {
            expect(() => { injectEnvironment(asCompose({}), { A: 'b' }); }).not.toThrow();
        });
    });
});
