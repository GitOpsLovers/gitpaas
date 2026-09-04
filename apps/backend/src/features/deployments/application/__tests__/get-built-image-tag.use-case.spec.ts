import { getBuiltImageTagUseCase } from '../get-built-image-tag.use-case';

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('getBuiltImageTagUseCase', () => {
    it('joins the Compose project, the identifier of the service and the name of the Compose service', () => {
        expect(getBuiltImageTagUseCase('acme_shop', serviceId, 'web')).toBe(`acme_shop_${serviceId}_web`);
    });

    it('gives two services of one project two distinct tags for the same name of a Compose service', () => {
        const sibling = 'c9d0e1f2-a3b4-4c5d-8e9f-0a1b2c3d4e5f';

        expect(getBuiltImageTagUseCase('acme_shop', serviceId, 'web')).not.toBe(getBuiltImageTagUseCase('acme_shop', sibling, 'web'));
    });

    it('gives one service two distinct tags for two names of a Compose service', () => {
        expect(getBuiltImageTagUseCase('acme_shop', serviceId, 'web')).not.toBe(getBuiltImageTagUseCase('acme_shop', serviceId, 'worker'));
    });

    it('builds a tag the daemon accepts, of lowercase characters and of separators alone', () => {
        expect(getBuiltImageTagUseCase('acme_shop', serviceId, 'web')).toMatch(/^[\da-z][\d._a-z-]*$/);
    });
});
