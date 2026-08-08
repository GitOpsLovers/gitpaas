import { getGitpaasLabels } from '../get-gitpaas-labels.use-case';

describe('get-gitpaas-labels.use-case', () => {
    describe('getGitpaasLabels', () => {
        it('selects only resources carrying the GitPaaS ownership marker', () => {
            expect(getGitpaasLabels()).toEqual({ 'io.gitpaas.managed': 'true' });
        });

        it('hands out a fresh selector per call, so a caller mutating one cannot widen another', () => {
            const first = getGitpaasLabels() as Record<string, string | null>;
            first['io.gitpaas.project'] = 'anything';

            expect(getGitpaasLabels()).toEqual({ 'io.gitpaas.managed': 'true' });
        });
    });
});
