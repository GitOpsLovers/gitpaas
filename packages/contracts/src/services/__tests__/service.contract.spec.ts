import {
    COMPOSER_PATH_MAX_LENGTH,
    createServiceSchema,
    isSafeComposerPath,
    SERVICE_NAME_MAX_LENGTH,
    SERVICE_NAME_MESSAGE,
    serviceSchema,
    storedComposerPath,
    updateServiceSchema,
} from '../service.contract';

/** A payload satisfying every rule of `createServiceSchema`. */
const createBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'api',
    projectId: '9c858901-8a57-4791-81fe-4c455b099bc9',
    ...overrides,
});

/** A payload satisfying every rule of `updateServiceSchema`. */
const updateBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'api',
    ...overrides,
});

describe('createServiceSchema', () => {
    it('accepts a valid body', () => {
        expect(createServiceSchema.safeParse(createBody()).success).toBe(true);
    });

    it('rejects a missing name', () => {
        const { name: _name, ...withoutName } = createBody();

        expect(createServiceSchema.safeParse(withoutName).success).toBe(false);
    });

    it('rejects an empty name', () => {
        expect(createServiceSchema.safeParse(createBody({ name: '' })).success).toBe(false);
    });

    it.each(['###', '!!!', '   ', '---', '_'])('rejects the name %p, because its slug is empty', (name) => {
        expect(createServiceSchema.safeParse(createBody({ name })).success).toBe(false);
    });

    it('gives the message of the rule when the name holds no letter and no number', () => {
        const result = createServiceSchema.safeParse(createBody({ name: '###' }));

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe(SERVICE_NAME_MESSAGE);
    });

    it.each(['api', 'API', '7', 'my service!', '### api ###', 'ñ1'])('accepts the name %p', (name) => {
        expect(createServiceSchema.safeParse(createBody({ name })).success).toBe(true);
    });

    it('accepts a name of exactly the greatest length', () => {
        const name = 'a'.repeat(SERVICE_NAME_MAX_LENGTH);

        expect(createServiceSchema.safeParse(createBody({ name })).success).toBe(true);
    });

    it('rejects a name longer than the greatest length', () => {
        const name = 'a'.repeat(SERVICE_NAME_MAX_LENGTH + 1);

        expect(createServiceSchema.safeParse(createBody({ name })).success).toBe(false);
    });

    it('rejects an unknown key', () => {
        expect(createServiceSchema.safeParse(createBody({ id: 'injected' })).success).toBe(false);
    });
});

describe('updateServiceSchema', () => {
    it('accepts a valid body', () => {
        expect(updateServiceSchema.safeParse(updateBody()).success).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(updateServiceSchema.safeParse(updateBody({ name: '' })).success).toBe(false);
    });

    it.each(['###', '!!!', '   ', '---'])('rejects the name %p, because its slug is empty', (name) => {
        expect(updateServiceSchema.safeParse(updateBody({ name })).success).toBe(false);
    });

    it('gives the message of the rule when the name holds no letter and no number', () => {
        const result = updateServiceSchema.safeParse(updateBody({ name: '!!!' }));

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe(SERVICE_NAME_MESSAGE);
    });

    it('accepts a name that holds one number alone', () => {
        expect(updateServiceSchema.safeParse(updateBody({ name: '2' })).success).toBe(true);
    });

    it('rejects a name longer than the greatest length', () => {
        const name = 'a'.repeat(SERVICE_NAME_MAX_LENGTH + 1);

        expect(updateServiceSchema.safeParse(updateBody({ name })).success).toBe(false);
    });
});

describe('serviceSchema', () => {
    it('accepts a service that already exists and holds a name with no letter and no number', () => {
        const service = {
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            name: '###',
            description: 'The legacy service',
            projectId: '9c858901-8a57-4791-81fe-4c455b099bc9',
            providerId: null,
            repositoryId: '',
            deploymentBranch: '',
            composerPath: '',
            createdAt: '2026-01-01T00:00:00.000Z',
        };

        expect(serviceSchema.safeParse(service).success).toBe(true);
    });
});

describe('isSafeComposerPath', () => {
    it.each(['docker-compose.yml', './compose.yaml', 'stacks/production/compose.yml', 'a..b/compose.yml'])(
        'accepts the relative path %p',
        (path) => {
            expect(isSafeComposerPath(path)).toBe(true);
        },
    );

    it.each(['', '/etc/passwd', '~/compose.yml', '../compose.yml', 'stacks/../../compose.yml', '..', 'a\\b.yml'])(
        'refuses the path %p, because it escapes the repository',
        (path) => {
            expect(isSafeComposerPath(path)).toBe(false);
        },
    );
});

describe('the composerPath of updateServiceSchema', () => {
    it('accepts a relative path', () => {
        expect(updateServiceSchema.safeParse(updateBody({ composerPath: 'stacks/compose.yml' })).success).toBe(true);
    });

    it('accepts a body that carries no path at all', () => {
        expect(updateServiceSchema.safeParse(updateBody()).success).toBe(true);
    });

    it.each(['', '/etc/passwd', '../compose.yml', '~/compose.yml'])('rejects the path %p', (composerPath) => {
        expect(updateServiceSchema.safeParse(updateBody({ composerPath })).success).toBe(false);
    });

    it('rejects a path longer than its greatest count of characters', () => {
        const composerPath = `${'a'.repeat(COMPOSER_PATH_MAX_LENGTH)}.yml`;

        expect(updateServiceSchema.safeParse(updateBody({ composerPath })).success).toBe(false);
    });
});

describe('storedComposerPath', () => {
    it('accepts the empty path of a service that carries no compose file yet', () => {
        expect(storedComposerPath.safeParse('').success).toBe(true);
    });

    it('accepts a relative path', () => {
        expect(storedComposerPath.safeParse('compose.yml').success).toBe(true);
    });

    it.each(['/etc/passwd', '../compose.yml', '~/compose.yml'])('rejects the path %p', (path) => {
        expect(storedComposerPath.safeParse(path).success).toBe(false);
    });
});
