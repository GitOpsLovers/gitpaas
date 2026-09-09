import { parse } from 'yaml';

import type { ComposeRecipe } from '../compose-recipe.transformer';
import {
    MASKED_VALUE,
    declareAttachedNetworks,
    maskEnvironment,
    relativizeBindMounts,
    relativizeBindSource,
    relativizeServiceVolume,
    toFinalComposeText,
} from '../final-compose.transformer';

import type { RuntimeComposeProject } from '@core/domain/models/container-runtime.models';

/**
 * Casts a bare recipe fixture to the compose project shape the transformer reads
 * its recipe from (the runtime object carries it as an untyped property).
 */
const asCompose = (fixture: unknown): RuntimeComposeProject => fixture as RuntimeComposeProject;

/** Directory of the compose file of the extracted repository, which every bind mount resolved against. */
const baseDir = '/tmp/gitpaas-deploy-a1b2c3';

/** Alias the containers of the stack answer to on the networks of the project. */

describe('final-compose.transformer', () => {
    describe('relativizeBindSource', () => {
        it('rewrites a source under the directory of the compose file into a relative path', () => {
            expect(relativizeBindSource(`${baseDir}/data/db`, baseDir)).toBe('./data/db');
        });

        it('rewrites the directory of the compose file itself into the current directory', () => {
            expect(relativizeBindSource(baseDir, baseDir)).toBe('.');
        });

        it('leaves a source of the host that lies outside the extracted repository unchanged', () => {
            expect(relativizeBindSource('/var/run/docker.sock', baseDir)).toBe('/var/run/docker.sock');
        });

        it('leaves a source of a sibling folder with the same prefix unchanged', () => {
            expect(relativizeBindSource(`${baseDir}-other/data`, baseDir)).toBe(`${baseDir}-other/data`);
        });
    });

    describe('relativizeServiceVolume', () => {
        it('rewrites the source of the short form and keeps its target and its mode', () => {
            expect(relativizeServiceVolume(`${baseDir}/data:/var/lib/data:ro`, baseDir)).toBe('./data:/var/lib/data:ro');
        });

        it('leaves a named volume of the short form unchanged', () => {
            expect(relativizeServiceVolume('db-data:/var/lib/postgresql/data', baseDir)).toBe('db-data:/var/lib/postgresql/data');
        });

        it('leaves an anonymous volume of the short form unchanged', () => {
            expect(relativizeServiceVolume('/var/lib/data', baseDir)).toBe('/var/lib/data');
        });

        it('rewrites the source of the long form of a bind mount', () => {
            const volume = { type: 'bind', source: `${baseDir}/config`, target: '/etc/app' };

            expect(relativizeServiceVolume(volume, baseDir)).toEqual({ type: 'bind', source: './config', target: '/etc/app' });
        });

        it('leaves the long form of a named volume unchanged', () => {
            const volume = { type: 'volume', source: 'db-data', target: '/var/lib/data' };

            expect(relativizeServiceVolume(volume, baseDir)).toEqual(volume);
        });
    });

    describe('relativizeBindMounts', () => {
        it('rewrites every bind mount of every service and leaves a service with no volume untouched', () => {
            const recipe: ComposeRecipe = {
                services: {
                    web: { volumes: [`${baseDir}/public:/usr/share/nginx/html`, 'logs:/var/log'] },
                    cache: { image: 'redis:7' },
                },
            };

            relativizeBindMounts(recipe, baseDir);

            expect(recipe.services?.web.volumes).toEqual(['./public:/usr/share/nginx/html', 'logs:/var/log']);
            expect(recipe.services?.cache).toEqual({ image: 'redis:7' });
        });
    });

    describe('maskEnvironment', () => {
        it('masks the value of every entry of the list form and keeps the name of the variable', () => {
            const recipe: ComposeRecipe = { services: { web: { environment: ['DB_PASSWORD=s3cret', 'TOKEN=a=b'] } } };

            maskEnvironment(recipe);

            expect(recipe.services?.web.environment).toEqual([`DB_PASSWORD=${MASKED_VALUE}`, `TOKEN=${MASKED_VALUE}`]);
        });

        it('keeps a bare key of the list form unchanged, which carries no value in the file', () => {
            const recipe: ComposeRecipe = { services: { web: { environment: ['HOME_PATH'] } } };

            maskEnvironment(recipe);

            expect(recipe.services?.web.environment).toEqual(['HOME_PATH']);
        });

        it('masks the value of every entry of the map form and keeps the map form', () => {
            const recipe: ComposeRecipe = { services: { web: { environment: { DB_PASSWORD: 's3cret', PORT: 8080 } } } };

            maskEnvironment(recipe);

            expect(recipe.services?.web.environment).toEqual({ DB_PASSWORD: MASKED_VALUE, PORT: MASKED_VALUE });
        });

        it('leaves a service that declares no environment untouched', () => {
            const recipe: ComposeRecipe = { services: { cache: { image: 'redis:7' } } };

            maskEnvironment(recipe);

            expect(recipe.services?.cache).toEqual({ image: 'redis:7' });
        });
    });

    describe('declareAttachedNetworks', () => {
        it('declares the network of the proxy as external and joins the routed service alone to it', () => {
            const recipe: ComposeRecipe = {
                services: { web: { networks: ['deploy'] }, cache: { networks: ['deploy'] } },
                networks: { deploy: {} },
            };

            declareAttachedNetworks(recipe, new Set(['web']));

            expect(recipe.networks).toEqual({ deploy: {}, 'gitpaas-proxy': { external: true } });
            expect(recipe.services?.web.networks).toEqual({ deploy: null, 'gitpaas-proxy': null });
            expect(recipe.services?.cache.networks).toEqual(['deploy']);
        });

        it('keeps the options a service already declares on a network of the map form', () => {
            const recipe: ComposeRecipe = {
                services: { web: { networks: { deploy: { aliases: ['web'] } } } },
                networks: { deploy: {} },
            };

            declareAttachedNetworks(recipe, new Set(['web']), { web: ['shared'] });

            expect(recipe.services?.web.networks).toEqual({
                deploy: { aliases: ['web'] },
                'gitpaas-proxy': null,
                shared: { aliases: ['web'] },
            });
        });

        it('declares every external network of the recipe again, and joins its service to it under the name of that service', () => {
            const recipe: ComposeRecipe = {
                services: { web: {}, cache: {} },
                networks: {},
            };

            declareAttachedNetworks(recipe, new Set(), { web: ['shared', 'edge'] });

            expect(recipe.networks).toEqual({ shared: { external: true }, edge: { external: true } });
            expect(recipe.services?.web.networks).toEqual({ shared: { aliases: ['web'] }, edge: { aliases: ['web'] } });
            expect(recipe.services?.cache.networks).toBeUndefined();
        });

        it('joins a service to the network of the proxy and to the external network of the recipe at once', () => {
            const recipe: ComposeRecipe = { services: { web: { networks: ['deploy'] } }, networks: { deploy: {} } };

            declareAttachedNetworks(recipe, new Set(['web']), { web: ['shared'] });

            expect(recipe.networks).toEqual({
                deploy: {},
                'gitpaas-proxy': { external: true },
                shared: { external: true },
            });
            expect(recipe.services?.web.networks).toEqual({
                deploy: null,
                'gitpaas-proxy': null,
                shared: { aliases: ['web'] },
            });
        });

        it('leaves the recipe untouched when the stack joins no network after its start', () => {
            const recipe: ComposeRecipe = { services: { web: { networks: ['deploy'] } }, networks: { deploy: {} } };

            declareAttachedNetworks(recipe, new Set());

            expect(recipe.networks).toEqual({ deploy: {} });
            expect(recipe.services?.web.networks).toEqual(['deploy']);
        });
    });

    describe('toFinalComposeText', () => {
        it('dumps the recipe as YAML with the networks declared, the bind mounts relative and the variables masked', () => {
            const compose = asCompose({
                recipe: {
                    services: {
                        web: {
                            image: 'nginx:1.27',
                            environment: ['DB_PASSWORD=s3cret'],
                            volumes: [`${baseDir}/public:/usr/share/nginx/html`],
                            networks: ['deploy'],
                        },
                    },
                    networks: { deploy: {} },
                },
            });

            const text = toFinalComposeText(compose, baseDir, new Set(['web']));

            expect(parse(text)).toEqual({
                services: {
                    web: {
                        image: 'nginx:1.27',
                        environment: [`DB_PASSWORD=${MASKED_VALUE}`],
                        volumes: ['./public:/usr/share/nginx/html'],
                        networks: { deploy: null, 'gitpaas-proxy': null },
                    },
                },
                networks: { deploy: {}, 'gitpaas-proxy': { external: true } },
            });
        });

        it('dumps the external networks of the recipe the executor stripped, so the text states what the stack joins', () => {
            const compose = asCompose({
                recipe: { services: { web: { image: 'nginx:1.27' } }, networks: {} },
            });

            const text = toFinalComposeText(compose, baseDir, new Set(), { web: ['shared'] });

            expect(parse(text)).toEqual({
                services: { web: { image: 'nginx:1.27', networks: { shared: { aliases: ['web'] } } } },
                networks: { shared: { external: true } },
            });
        });

        it('never touches the recipe the daemon receives, which keeps the true value of every variable', () => {
            const recipe = {
                services: {
                    web: {
                        environment: ['DB_PASSWORD=s3cret'],
                        volumes: [`${baseDir}/public:/usr/share/nginx/html`],
                        networks: ['deploy'],
                    },
                },
                networks: { deploy: {} },
            };

            toFinalComposeText(asCompose({ recipe }), baseDir, new Set(['web']));

            expect(recipe).toEqual({
                services: {
                    web: {
                        environment: ['DB_PASSWORD=s3cret'],
                        volumes: [`${baseDir}/public:/usr/share/nginx/html`],
                        networks: ['deploy'],
                    },
                },
                networks: { deploy: {} },
            });
        });
    });
});
