import { DbNamespaceEntity } from '../db-namespace.entity';
import { toNamespace } from '../db-namespaces.transformer';

describe('toNamespace', () => {
    it('maps the entity fields into the domain namespace', () => {
        const entity: DbNamespaceEntity = { id: 'n-1', name: 'default' };

        expect(toNamespace(entity)).toEqual({
            id: 'n-1',
            name: 'default',
        });
    });

    it('carries the values of the entity it received, and not fixed ones', () => {
        const entity: DbNamespaceEntity = { id: 'n-2', name: 'platform' };

        expect(toNamespace(entity)).toEqual({
            id: 'n-2',
            name: 'platform',
        });
    });

    it('never leaks a projectsCount while the projects relation is not mapped yet', () => {
        const entity: DbNamespaceEntity = { id: 'n-3', name: 'empty' };

        expect(toNamespace(entity)).not.toHaveProperty('projectsCount');
    });
});
