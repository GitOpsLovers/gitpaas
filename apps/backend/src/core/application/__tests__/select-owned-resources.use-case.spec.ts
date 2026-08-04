import { selectOwnedResourcesUseCase } from '../select-owned-resources.use-case';

describe('select-owned-resources.use-case', () => {
    describe('selectOwnedResourcesUseCase', () => {
        it('selects only resources carrying the GitPaaS ownership marker', () => {
            expect(selectOwnedResourcesUseCase()).toEqual({ 'io.gitpaas.managed': 'true' });
        });

        it('hands out a fresh selector per call, so a caller mutating one cannot widen another', () => {
            const first = selectOwnedResourcesUseCase() as Record<string, string | null>;
            first['io.gitpaas.project'] = 'anything';

            expect(selectOwnedResourcesUseCase()).toEqual({ 'io.gitpaas.managed': 'true' });
        });
    });
});
