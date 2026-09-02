import { DbNamespaceEntity } from '../db-namespace.entity';
import { toNamespace } from '../db-namespaces.transformer';

/** Builds a namespace database-entity fixture, overriding only the fields under test. */
const namespaceEntity = (overrides: Partial<DbNamespaceEntity> = {}): DbNamespaceEntity => ({
    id: 'n-1',
    name: 'default',
    description: 'The scope by default',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
});

describe('toNamespace', () => {
    it('maps the entity fields into the domain namespace', () => {
        expect(toNamespace(namespaceEntity())).toEqual({
            id: 'n-1',
            name: 'default',
            description: 'The scope by default',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        });
    });

    it('carries the values of the entity it received, and not fixed ones', () => {
        const entity = namespaceEntity({
            id: 'n-2',
            name: 'platform',
            description: 'The control plane',
            createdAt: new Date('2026-06-15T09:30:00.000Z'),
        });

        expect(toNamespace(entity)).toEqual({
            id: 'n-2',
            name: 'platform',
            description: 'The control plane',
            createdAt: new Date('2026-06-15T09:30:00.000Z'),
        });
    });

    it('carries the empty description of a namespace that holds none', () => {
        expect(toNamespace(namespaceEntity({ description: '' })).description).toBe('');
    });

    it('keeps the date of creation as a date, and never as a text', () => {
        expect(toNamespace(namespaceEntity()).createdAt).toBeInstanceOf(Date);
    });

    it('never leaks a projectsCount while the projects relation is not mapped yet', () => {
        expect(toNamespace(namespaceEntity({ id: 'n-3', name: 'empty' }))).not.toHaveProperty('projectsCount');
    });

    it('never carries a relation the entity holds beside the mapped fields', () => {
        expect(toNamespace(namespaceEntity({ projects: [] }))).not.toHaveProperty('projects');
    });
});
