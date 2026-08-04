import { gitpaasLabels, gitpaasProjectSelector } from '../gitpaas-labels.util';

describe('gitpaas-labels.util', () => {
    describe('gitpaasLabels', () => {
        it('builds the ownership marker and the project label', () => {
            expect(gitpaasLabels('my-service')).toEqual({
                'io.gitpaas.managed': 'true',
                'io.gitpaas.project': 'my-service',
            });
        });
    });

    describe('gitpaasProjectSelector', () => {
        it('adds the GitPaaS project label to the marker', () => {
            expect(gitpaasProjectSelector('my-service')).toEqual({
                'io.gitpaas.managed': 'true',
                'io.gitpaas.project': 'my-service',
            });
        });

        it('always keeps the ownership marker, never the project label alone', () => {
            expect(gitpaasProjectSelector('my-service')['io.gitpaas.managed']).toBe('true');
        });

        it('keeps the marker first, so the serialised filter stays deterministic', () => {
            expect(Object.keys(gitpaasProjectSelector('my-service'))).toEqual([
                'io.gitpaas.managed',
                'io.gitpaas.project',
            ]);
        });
    });
});
