import { assertSafeRecipe } from '../compose-guard';
import { interpolateRecipe } from '../compose-interpolation';
import type { ComposeRecipe } from '../compose-recipe.transformer';

import { UnsafeComposeRecipeError } from '@core/domain/errors/compose.errors';

/** Builds a recipe of one compose service named "web", overriding only the keys under test. */
const recipe = (service: Record<string, unknown>): ComposeRecipe =>
    ({ services: { web: { image: 'nginx:1.27', ...service } } });

describe('assertSafeRecipe', () => {
    it('accepts a recipe that declares the ordinary keys of a compose service', () => {
        expect(() => {
            assertSafeRecipe(recipe({
                build: { context: '.', dockerfile: 'Dockerfile' },
                command: 'nginx -g "daemon off;"',
                depends_on: ['api'],
                environment: { NODE_ENV: 'production' },
                healthcheck: { test: ['CMD', 'true'], interval: '10s' },
                labels: ['owner=gitpaas'],
                networks: ['front'],
                ports: ['8080:80'],
                restart: 'unless-stopped',
                volumes: ['./data:/var/lib/data', 'named:/srv', '/srv/anonymous'],
            }));
        }).not.toThrow();
    });

    it('accepts a service that declares its domain in the key x-gitpaas-domain', () => {
        expect(() => {
            assertSafeRecipe(recipe({ 'x-gitpaas-domain': { host: 'app.example.com', port: 8080, https: true } }));
        }).not.toThrow();
    });

    it.each([
        ['a host of one label alone', { host: 'localhost', port: 80, https: true }],
        ['a port outside the range', { host: 'app.example.com', port: 70_000, https: true }],
        ['a port that is no number', { host: 'app.example.com', port: '80', https: true }],
        ['no flag https', { host: 'app.example.com', port: 80 }],
        ['no host', { port: 80, https: true }],
        ['a key the schema does not know', {
            host: 'app.example.com', port: 80, https: true, path: '/api',
        }],
        ['no block of keys at all', 'app.example.com'],
    ])('refuses a declared domain that carries %s', (_case, declaration) => {
        expect(() => { assertSafeRecipe(recipe({ 'x-gitpaas-domain': declaration })); })
            .toThrow(UnsafeComposeRecipeError);
    });

    it('names the service and the key x-gitpaas-domain in the message of the error of a declared domain', () => {
        expect(() => { assertSafeRecipe(recipe({ 'x-gitpaas-domain': { host: 'localhost', port: 80, https: true } })); })
            .toThrow(/services\.web\.x-gitpaas-domain/);
    });

    it('accepts a recipe that declares no service at all', () => {
        expect(() => { assertSafeRecipe({}); }).not.toThrow();
    });

    it.each(['privileged', 'cap_add', 'devices', 'security_opt', 'userns_mode'])(
        'refuses the key %p of a service, because it reaches the host',
        (key) => {
            expect(() => { assertSafeRecipe(recipe({ [key]: true })); }).toThrow(UnsafeComposeRecipeError);
        },
    );

    it('refuses a key of a service that GitPaaS does not know', () => {
        expect(() => { assertSafeRecipe(recipe({ cgroup_parent: '/docker' })); }).toThrow(UnsafeComposeRecipeError);
    });

    it('names the service and the key that failed in the message of the error', () => {
        expect(() => { assertSafeRecipe(recipe({ privileged: true })); })
            .toThrow(/services\.web\.privileged/);
    });

    it('carries the key that failed on the error, and the code UNSAFE_COMPOSE_RECIPE', () => {
        try {
            assertSafeRecipe(recipe({ privileged: true }));
            throw new Error('The gate accepted the recipe.');
        } catch (error) {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(error).toBeInstanceOf(UnsafeComposeRecipeError);
            // eslint-disable-next-line jest/no-conditional-expect
            expect((error as UnsafeComposeRecipeError).key).toBe('services.web.privileged');
            // eslint-disable-next-line jest/no-conditional-expect
            expect((error as UnsafeComposeRecipeError).code).toBe('UNSAFE_COMPOSE_RECIPE');
        }
    });

    it.each(['network_mode', 'pid', 'ipc'])('refuses the key %p when its value names the host', (key) => {
        expect(() => { assertSafeRecipe(recipe({ [key]: 'host' })); }).toThrow(UnsafeComposeRecipeError);
    });

    it.each(['network_mode', 'pid', 'ipc'])('refuses the key %p when its value names a container of the daemon', (key) => {
        expect(() => { assertSafeRecipe(recipe({ [key]: 'container:gitpaas-postgres' })); }).toThrow(UnsafeComposeRecipeError);
    });

    it.each(['network_mode', 'pid', 'ipc'])('accepts the key %p when its value stays inside the stack', (key) => {
        expect(() => { assertSafeRecipe(recipe({ [key]: 'service:api' })); }).not.toThrow();
    });

    it('refuses a volume that binds the socket of Docker', () => {
        expect(() => { assertSafeRecipe(recipe({ volumes: ['/var/run/docker.sock:/var/run/docker.sock'] })); })
            .toThrow(UnsafeComposeRecipeError);
    });

    it('refuses a volume that binds any absolute path of the host', () => {
        expect(() => { assertSafeRecipe(recipe({ volumes: ['/etc:/host-etc:ro'] })); })
            .toThrow(UnsafeComposeRecipeError);
    });

    it('refuses a volume that binds the home folder of the host', () => {
        expect(() => { assertSafeRecipe(recipe({ volumes: ['~/.ssh:/root/.ssh'] })); })
            .toThrow(UnsafeComposeRecipeError);
    });

    it('refuses a volume that leaves the folder of the repository with a segment ".."', () => {
        expect(() => { assertSafeRecipe(recipe({ volumes: ['../../etc:/host-etc'] })); })
            .toThrow(UnsafeComposeRecipeError);
    });

    it('refuses a bind mount of the long form that names a path of the host', () => {
        expect(() => {
            assertSafeRecipe(recipe({
                volumes: [{ type: 'bind', source: '/var/run/docker.sock', target: '/var/run/docker.sock' }],
            }));
        }).toThrow(UnsafeComposeRecipeError);
    });

    it('accepts a named volume of the long form, which carries no path of the host', () => {
        expect(() => {
            assertSafeRecipe(recipe({
                volumes: [{ type: 'volume', source: 'data', target: '/srv' }],
            }));
        }).not.toThrow();
    });

    it('accepts a relative bind mount, which resolves inside the repository of the service', () => {
        expect(() => { assertSafeRecipe(recipe({ volumes: ['./config/nginx.conf:/etc/nginx/nginx.conf:ro'] })); })
            .not.toThrow();
    });

    it('refuses a key a variable of the service carried into the recipe through the interpolation', () => {
        const interpolated = interpolateRecipe(
            { services: { web: { image: 'nginx:1.27', '${DANGEROUS_KEY}': true } } },
            { DANGEROUS_KEY: 'privileged' },
        ) as unknown as ComposeRecipe;

        expect(() => { assertSafeRecipe(interpolated); }).toThrow(/services\.web\.privileged/);
    });

    it('accepts a network of the recipe that names a network of its own project', () => {
        expect(() => { assertSafeRecipe({ networks: { front: null, back: { name: 'shared-back' } } }); }).not.toThrow();
    });

    it('accepts an external network of the recipe that GitPaaS does not own', () => {
        expect(() => { assertSafeRecipe({ networks: { shared: { external: true } } }); }).not.toThrow();
    });

    it.each(['gitpaas-proxy', 'gitpaas-data', 'gitpaas_default', 'gitpaas-dev_default'])(
        'refuses the external network %p, because GitPaaS owns it',
        (name) => {
            expect(() => { assertSafeRecipe({ networks: { [name]: { external: true } } }); })
                .toThrow(UnsafeComposeRecipeError);
        },
    );

    it('names the key of the network that failed, and not the name it carries on the daemon', () => {
        expect(() => { assertSafeRecipe({ networks: { data: { external: true, name: 'gitpaas-data' } } }); })
            .toThrow(/networks\.data/);
    });

    it('refuses a network of the recipe that carries the name of a network of GitPaaS without the key external', () => {
        expect(() => { assertSafeRecipe({ networks: { data: { name: 'gitpaas-data' } } }); })
            .toThrow(UnsafeComposeRecipeError);
    });

    it('refuses a network a variable of the service carried into the recipe through the interpolation', () => {
        const interpolated = interpolateRecipe(
            { networks: { edge: { external: true, name: '${NETWORK}' } } },
            { NETWORK: 'gitpaas-proxy' },
        ) as unknown as ComposeRecipe;

        expect(() => { assertSafeRecipe(interpolated); }).toThrow(UnsafeComposeRecipeError);
    });

    it('refuses a volume a variable of the service carried into the recipe through the interpolation', () => {
        const interpolated = interpolateRecipe(
            { services: { web: { image: 'nginx:1.27', volumes: ['${SOURCE}:/host'] } } },
            { SOURCE: '/var/run/docker.sock' },
        ) as unknown as ComposeRecipe;

        expect(() => { assertSafeRecipe(interpolated); }).toThrow(UnsafeComposeRecipeError);
    });
});
