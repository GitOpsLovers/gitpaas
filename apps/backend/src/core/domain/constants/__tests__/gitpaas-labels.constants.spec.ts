import { GITPAAS_CONTROL_PLANE_PROJECTS } from '../gitpaas-labels.constants';

describe('gitpaas-labels.constants', () => {
    describe('GITPAAS_CONTROL_PLANE_PROJECTS', () => {
        it('protects both the production and development control-plane stacks', () => {
            expect(GITPAAS_CONTROL_PLANE_PROJECTS).toEqual(['gitpaas', 'gitpaas-dev']);
        });
    });
});
