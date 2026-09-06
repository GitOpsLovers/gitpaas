import { interpolateRecipe } from '../compose-interpolation';

/** Variables of the section "Environments" of the service, as they reach the deployment. */
const variables = { TAG: '1.4.0', REGISTRY: 'ghcr.io', EMPTY: '' };

/**
 * Interpolates one text of a recipe, which the walk of the recipe reaches at the value of a service.
 */
const interpolate = (text: string, overrides: Record<string, string> = variables): string => {
    const recipe = interpolateRecipe({ services: { web: { image: text } } }, overrides);

    return recipe.services.web.image;
};

describe('interpolateRecipe', () => {
    it('substitutes the braced form "${VAR}" with the value of the service', () => {
        expect(interpolate('nginx:${TAG}')).toBe('nginx:1.4.0');
    });

    it('substitutes the bare form "$VAR" with the value of the service', () => {
        expect(interpolate('nginx:$TAG')).toBe('nginx:1.4.0');
    });

    it('takes the default of "${VAR:-default}" for an unset and for an empty variable, and the value otherwise', () => {
        expect(interpolate('${MISSING:-latest}')).toBe('latest');
        expect(interpolate('${EMPTY:-latest}')).toBe('latest');
        expect(interpolate('${TAG:-latest}')).toBe('1.4.0');
    });

    it('takes the default of "${VAR-default}" for an unset variable alone, and keeps an empty value', () => {
        expect(interpolate('${MISSING-latest}')).toBe('latest');
        expect(interpolate('${EMPTY-latest}')).toBe('');
        expect(interpolate('${TAG-latest}')).toBe('1.4.0');
    });

    it('interpolates the default itself, so it reads a variable of the service too', () => {
        expect(interpolate('${MISSING:-$REGISTRY}')).toBe('ghcr.io');
    });

    it('turns "$$" into one literal "$", and never reads the name that follows it', () => {
        expect(interpolate('$${TAG}')).toBe('${TAG}');
        expect(interpolate('cost: $$5')).toBe('cost: $5');
    });

    it('gives an empty text to a variable the service does not hold, in either form', () => {
        expect(interpolate('nginx:${MISSING}')).toBe('nginx:');
        expect(interpolate('nginx:$MISSING')).toBe('nginx:');
    });

    it('leaves a text that holds no reference untouched', () => {
        expect(interpolate('nginx:latest')).toBe('nginx:latest');
    });

    it('substitutes every depth of a nested map, and the key of an entry too', () => {
        const recipe = {
            services: {
                web: {
                    labels: { 'app.$TAG': 'release-${TAG}' },
                    deploy: { placement: { constraints: ['node.labels.tier==${MISSING:-web}'] } },
                },
            },
        };

        expect(interpolateRecipe(recipe, variables)).toEqual({
            services: {
                web: {
                    labels: { 'app.1.4.0': 'release-1.4.0' },
                    deploy: { placement: { constraints: ['node.labels.tier==web'] } },
                },
            },
        });
    });

    it('substitutes every item of a list', () => {
        const recipe = { services: { web: { ports: ['${PORT:-8080}:80', '$TAG'] } } };

        expect(interpolateRecipe(recipe, variables).services.web.ports).toEqual(['8080:80', '1.4.0']);
    });

    it('substitutes a reference the "build.args" of a service holds, in either the list or the map form', () => {
        const recipe = {
            services: {
                web: { build: { context: '.', args: ['VERSION=${TAG}'] } },
                api: { build: { context: '${MISSING:-api}', args: { BASE: '${REGISTRY}/node:$TAG' } } },
            },
        };

        expect(interpolateRecipe(recipe, variables)).toEqual({
            services: {
                web: { build: { context: '.', args: ['VERSION=1.4.0'] } },
                api: { build: { context: 'api', args: { BASE: 'ghcr.io/node:1.4.0' } } },
            },
        });
    });

    it('keeps a value that is no text as it is', () => {
        const recipe = {
            services: {
                web: {
                    scale: 2, tty: true, image: null, command: undefined,
                },
            },
        };

        expect(interpolateRecipe(recipe, variables)).toEqual({
            services: {
                web: {
                    scale: 2, tty: true, image: null, command: undefined,
                },
            },
        });
    });

    it('changes no input, and returns a new recipe', () => {
        const service = { image: 'nginx:${TAG}', ports: ['${TAG}'] };
        const recipe = { services: { web: service } };

        const interpolated = interpolateRecipe(recipe, variables);

        expect(service).toEqual({ image: 'nginx:${TAG}', ports: ['${TAG}'] });
        expect(interpolated).not.toBe(recipe);
        expect(interpolated.services.web).not.toBe(service);
    });

    it('gives an empty text to every reference when the service holds no variable', () => {
        expect(interpolate('${TAG}-$REGISTRY', {})).toBe('-');
    });
});
