import {
    createProjectNetworkSchema,
    joinProjectNetworkSchema,
    PROJECT_NETWORK_NAME_MAX_LENGTH,
    updateProjectNetworkSchema,
} from '../project-network.contract';

describe('createProjectNetworkSchema', () => {
    it('accepts a valid body', () => {
        expect(createProjectNetworkSchema.safeParse({ name: 'private' }).success).toBe(true);
    });

    it('puts the name into small letters, so one project cannot hold it in two forms', () => {
        expect(createProjectNetworkSchema.parse({ name: 'Private' }).name).toBe('private');
    });

    it('trims the spaces around the name', () => {
        expect(createProjectNetworkSchema.parse({ name: '  private  ' }).name).toBe('private');
    });

    it('refuses an empty name', () => {
        expect(createProjectNetworkSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('refuses a name that starts with the hyphen', () => {
        expect(createProjectNetworkSchema.safeParse({ name: '-private' }).success).toBe(false);
    });

    it('refuses a name that ends with the hyphen', () => {
        expect(createProjectNetworkSchema.safeParse({ name: 'private-' }).success).toBe(false);
    });

    it('refuses a name that carries a character beyond the letters, the numbers and the hyphen', () => {
        expect(createProjectNetworkSchema.safeParse({ name: 'private_net' }).success).toBe(false);
    });

    it('accepts a name of the greatest length', () => {
        const name = 'a'.repeat(PROJECT_NETWORK_NAME_MAX_LENGTH);

        expect(createProjectNetworkSchema.safeParse({ name }).success).toBe(true);
    });

    it('refuses a name beyond the greatest length', () => {
        const name = 'a'.repeat(PROJECT_NETWORK_NAME_MAX_LENGTH + 1);

        expect(createProjectNetworkSchema.safeParse({ name }).success).toBe(false);
    });

    it('refuses a field that the body does not declare', () => {
        expect(createProjectNetworkSchema.safeParse({ name: 'private', internal: false }).success).toBe(false);
    });
});

describe('updateProjectNetworkSchema', () => {
    it('accepts a valid body', () => {
        expect(updateProjectNetworkSchema.safeParse({ name: 'backend' }).success).toBe(true);
    });

    it('asks for the name, because the rename carries nothing else', () => {
        expect(updateProjectNetworkSchema.safeParse({}).success).toBe(false);
    });
});

describe('joinProjectNetworkSchema', () => {
    it('accepts the identifier of a service', () => {
        const body = { serviceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' };

        expect(joinProjectNetworkSchema.safeParse(body).success).toBe(true);
    });

    it('refuses a service that is no UUID', () => {
        expect(joinProjectNetworkSchema.safeParse({ serviceId: 'web' }).success).toBe(false);
    });

    it('refuses a body with no service', () => {
        expect(joinProjectNetworkSchema.safeParse({}).success).toBe(false);
    });
});
