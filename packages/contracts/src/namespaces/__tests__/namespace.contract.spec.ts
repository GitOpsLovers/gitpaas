import { createNamespaceSchema, namespaceSchema, updateNamespaceSchema } from '../namespace.contract';

/** A payload satisfying every rule of `createNamespaceSchema`. */
const validBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'platform',
    ...overrides,
});

/** A payload satisfying every rule of `namespaceSchema`. */
const validNamespace = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    name: 'platform',
    description: 'The control plane',
    createdAt: '2026-01-01T00:00:00.000Z',
    projectsCount: 3,
    ...overrides,
});

describe('createNamespaceSchema', () => {
    it('accepts a valid body', () => {
        expect(createNamespaceSchema.safeParse(validBody()).success).toBe(true);
    });

    it('rejects a missing name', () => {
        const { name: _name, ...withoutName } = validBody();

        expect(createNamespaceSchema.safeParse(withoutName).success).toBe(false);
    });

    it('rejects an empty name', () => {
        expect(createNamespaceSchema.safeParse(validBody({ name: '' })).success).toBe(false);
    });

    it('rejects an unknown key', () => {
        expect(createNamespaceSchema.safeParse(validBody({ id: 'injected' })).success).toBe(false);
    });

    it('accepts a body with no description', () => {
        expect(createNamespaceSchema.safeParse(validBody()).success).toBe(true);
    });

    it('accepts an empty description', () => {
        expect(createNamespaceSchema.safeParse(validBody({ description: '' })).success).toBe(true);
    });

    it('rejects a description that is not a text', () => {
        expect(createNamespaceSchema.safeParse(validBody({ description: 42 })).success).toBe(false);
    });

    it('rejects a description longer than 500 characters', () => {
        expect(createNamespaceSchema.safeParse(validBody({ description: 'a'.repeat(501) })).success).toBe(false);
    });

    it('accepts a description of exactly 500 characters', () => {
        expect(createNamespaceSchema.safeParse(validBody({ description: 'a'.repeat(500) })).success).toBe(true);
    });
});

describe('updateNamespaceSchema', () => {
    it('accepts a valid body', () => {
        expect(updateNamespaceSchema.safeParse(validBody()).success).toBe(true);
    });

    it('accepts a body that carries the description alone', () => {
        expect(updateNamespaceSchema.safeParse({ description: 'The control plane' }).success).toBe(true);
    });

    it('rejects an empty name, since a namespace never loses its name', () => {
        expect(updateNamespaceSchema.safeParse(validBody({ name: '' })).success).toBe(false);
    });

    it('rejects a name that is not a text', () => {
        expect(updateNamespaceSchema.safeParse(validBody({ name: 42 })).success).toBe(false);
    });

    it('rejects an unknown key', () => {
        expect(updateNamespaceSchema.safeParse(validBody({ createdAt: '2026-01-01' })).success).toBe(false);
    });

    it('accepts an empty description, which clears the one the namespace held', () => {
        expect(updateNamespaceSchema.safeParse(validBody({ description: '' })).success).toBe(true);
    });

    it('rejects a description longer than 500 characters', () => {
        expect(updateNamespaceSchema.safeParse(validBody({ description: 'a'.repeat(501) })).success).toBe(false);
    });
});

describe('namespaceSchema', () => {
    it('accepts a valid namespace', () => {
        expect(namespaceSchema.safeParse(validNamespace()).success).toBe(true);
    });

    it('rejects a namespace with no id', () => {
        const { id: _id, ...withoutId } = validNamespace();

        expect(namespaceSchema.safeParse(withoutId).success).toBe(false);
    });

    it('rejects an id that is not a UUID', () => {
        expect(namespaceSchema.safeParse(validNamespace({ id: 'not-a-uuid' })).success).toBe(false);
    });

    it('rejects an empty name', () => {
        expect(namespaceSchema.safeParse(validNamespace({ name: '' })).success).toBe(false);
    });

    it('rejects a namespace with no description', () => {
        const { description: _description, ...withoutDescription } = validNamespace();

        expect(namespaceSchema.safeParse(withoutDescription).success).toBe(false);
    });

    it('accepts an empty description', () => {
        expect(namespaceSchema.safeParse(validNamespace({ description: '' })).success).toBe(true);
    });

    it('rejects a namespace with no createdAt', () => {
        const { createdAt: _createdAt, ...withoutCreatedAt } = validNamespace();

        expect(namespaceSchema.safeParse(withoutCreatedAt).success).toBe(false);
    });

    it('rejects a createdAt that is not a date of the ISO form', () => {
        expect(namespaceSchema.safeParse(validNamespace({ createdAt: '2026-01-01' })).success).toBe(false);
    });

    it('rejects a createdAt carried as a Date, since the wire carries a text', () => {
        expect(namespaceSchema.safeParse(validNamespace({ createdAt: new Date() })).success).toBe(false);
    });

    it('accepts a namespace with no projectsCount', () => {
        const { projectsCount: _projectsCount, ...withoutCount } = validNamespace();

        expect(namespaceSchema.safeParse(withoutCount).success).toBe(true);
    });

    it('rejects a projectsCount that is negative', () => {
        expect(namespaceSchema.safeParse(validNamespace({ projectsCount: -1 })).success).toBe(false);
    });
});
