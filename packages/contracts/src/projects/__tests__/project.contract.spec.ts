import { createProjectSchema, projectSchema, updateProjectSchema } from '../project.contract';

/** A payload satisfying every rule of `createProjectSchema` and of `updateProjectSchema`. */
const validBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'gitpaas',
    ...overrides,
});

/** A payload satisfying every rule of `projectSchema`. */
const validProject = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    name: 'gitpaas',
    namespaceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    servicesCount: 3,
    ...overrides,
});

describe('createProjectSchema', () => {
    it('accepts a valid body', () => {
        expect(createProjectSchema.safeParse(validBody()).success).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(createProjectSchema.safeParse(validBody({ name: '' })).success).toBe(false);
    });

    it('rejects a missing name', () => {
        const { name: _name, ...withoutName } = validBody();

        expect(createProjectSchema.safeParse(withoutName).success).toBe(false);
    });

    it('rejects a name that is not a text', () => {
        expect(createProjectSchema.safeParse(validBody({ name: 42 })).success).toBe(false);
    });

    it('rejects an unknown key', () => {
        expect(createProjectSchema.safeParse(validBody({ id: 'injected' })).success).toBe(false);
    });
});

describe('updateProjectSchema', () => {
    it('accepts a valid body', () => {
        expect(updateProjectSchema.safeParse(validBody()).success).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(updateProjectSchema.safeParse(validBody({ name: '' })).success).toBe(false);
    });

    it('rejects a missing name', () => {
        const { name: _name, ...withoutName } = validBody();

        expect(updateProjectSchema.safeParse(withoutName).success).toBe(false);
    });

    it('rejects a name that is not a text', () => {
        expect(updateProjectSchema.safeParse(validBody({ name: 42 })).success).toBe(false);
    });

    it('rejects an unknown key', () => {
        expect(updateProjectSchema.safeParse(validBody({ createdAt: '2026-01-01' })).success).toBe(false);
    });
});

describe('projectSchema', () => {
    it('accepts a valid project', () => {
        expect(projectSchema.safeParse(validProject()).success).toBe(true);
    });

    it('rejects a project with no id', () => {
        const { id: _id, ...withoutId } = validProject();

        expect(projectSchema.safeParse(withoutId).success).toBe(false);
    });

    it('rejects a project with no name', () => {
        const { name: _name, ...withoutName } = validProject();

        expect(projectSchema.safeParse(withoutName).success).toBe(false);
    });

    it('rejects a project with no namespaceId', () => {
        const { namespaceId: _namespaceId, ...withoutNamespaceId } = validProject();

        expect(projectSchema.safeParse(withoutNamespaceId).success).toBe(false);
    });

    it('rejects a project with no servicesCount', () => {
        const { servicesCount: _servicesCount, ...withoutServicesCount } = validProject();

        expect(projectSchema.safeParse(withoutServicesCount).success).toBe(false);
    });

    it('rejects an id that is not a UUID', () => {
        expect(projectSchema.safeParse(validProject({ id: 'not-a-uuid' })).success).toBe(false);
    });

    it('rejects a namespaceId that is not a UUID', () => {
        expect(projectSchema.safeParse(validProject({ namespaceId: 'not-a-uuid' })).success).toBe(false);
    });

    it('rejects an empty name', () => {
        expect(projectSchema.safeParse(validProject({ name: '' })).success).toBe(false);
    });

    it('rejects a servicesCount that is negative', () => {
        expect(projectSchema.safeParse(validProject({ servicesCount: -1 })).success).toBe(false);
    });

    it('rejects a servicesCount that is not an integer', () => {
        expect(projectSchema.safeParse(validProject({ servicesCount: 1.5 })).success).toBe(false);
    });
});
