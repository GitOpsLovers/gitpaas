import { getGitpaasResourceLabels } from '../get-gitpaas-resource-labels.use-case';

describe('get-gitpaas-resource-labels.use-case', () => {
    describe('getGitpaasResourceLabels', () => {
        it('selects only resources carrying the GitPaaS ownership marker', () => {
            expect(getGitpaasResourceLabels()).toEqual({ 'io.gitpaas.managed': 'true' });
        });

        it('hands out a fresh selector per call, so a caller mutating one cannot widen another', () => {
            const first = getGitpaasResourceLabels() as Record<string, string | null>;
            first['io.gitpaas.project'] = 'anything';

            expect(getGitpaasResourceLabels()).toEqual({ 'io.gitpaas.managed': 'true' });
        });
    });
});
