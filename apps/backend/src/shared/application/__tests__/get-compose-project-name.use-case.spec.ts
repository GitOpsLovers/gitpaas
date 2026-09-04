import { getComposeProjectName } from '../get-compose-project-name.use-case';

const namespaceId = '5b1f6f2c-9c4b-4b1e-8a5f-0a1b2c3d4e5f';
const projectId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('get-compose-project-name.use-case', () => {
    describe('getComposeProjectName', () => {
        it('joins the two segments with an underscore', () => {
            expect(
                getComposeProjectName({ id: namespaceId, name: 'gitpaas' }, { id: projectId, name: 'web' }),
            ).toBe('gitpaas_web');
        });

        it('normalizes an uppercase letter and a space of both names', () => {
            expect(
                getComposeProjectName(
                    { id: namespaceId, name: 'Personal' },
                    { id: projectId, name: 'Common Databases' },
                ),
            ).toBe('personal_common_databases');
        });

        it('converts each segment into [a-z0-9_]', () => {
            expect(
                getComposeProjectName({ id: namespaceId, name: 'Git PaaS.io' }, { id: projectId, name: '--My Web!!' }),
            ).toBe('git_paas_io_my_web');
        });

        it('holds no character outside [a-z0-9_]', () => {
            const name = getComposeProjectName(
                { id: namespaceId, name: 'Ünï Corp' },
                { id: projectId, name: 'Store 42' },
            );

            // eslint-disable-next-line optimize-regex/optimize-regex
            expect(/^[\da-z][\da-z_]*$/.test(name)).toBe(true);
        });

        it('falls back to namespace-<id> when the name of the namespace holds no usable character', () => {
            expect(
                getComposeProjectName({ id: namespaceId, name: '!!!' }, { id: projectId, name: 'web' }),
            ).toBe(`namespace-${namespaceId}_web`);
        });

        it('falls back to project-<id> when the name of the project holds no usable character', () => {
            expect(
                getComposeProjectName({ id: namespaceId, name: 'gitpaas' }, { id: projectId, name: '   ' }),
            ).toBe(`gitpaas_project-${projectId}`);
        });

        it('never starts with a character Docker Compose refuses', () => {
            const name = getComposeProjectName({ id: namespaceId, name: '-- 9lives' }, { id: projectId, name: 'web' });

            expect(/^[\da-z]/.test(name)).toBe(true);
        });

        it('gives two different names to two projects that carry one name in two namespaces', () => {
            const first = getComposeProjectName({ id: namespaceId, name: 'alpha' }, { id: projectId, name: 'web' });
            const second = getComposeProjectName({ id: namespaceId, name: 'beta' }, { id: projectId, name: 'web' });

            expect(first).not.toBe(second);
        });
    });
});
