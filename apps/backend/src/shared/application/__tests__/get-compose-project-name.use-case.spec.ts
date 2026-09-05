import { getComposeProjectName } from '../get-compose-project-name.use-case';

const namespaceId = '5b1f6f2c-9c4b-4b1e-8a5f-0a1b2c3d4e5f';
const projectId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const serviceId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('get-compose-project-name.use-case', () => {
    describe('getComposeProjectName', () => {
        it('joins the three segments with an underscore', () => {
            expect(
                getComposeProjectName(
                    { id: namespaceId, name: 'gitpaas' },
                    { id: projectId, name: 'web' },
                    { id: serviceId, name: 'api' },
                ),
            ).toBe('gitpaas_web_api');
        });

        it('normalizes an uppercase letter and a space of every name', () => {
            expect(
                getComposeProjectName(
                    { id: namespaceId, name: 'Personal' },
                    { id: projectId, name: 'Common Databases' },
                    { id: serviceId, name: 'My Resume' },
                ),
            ).toBe('personal_common_databases_my_resume');
        });

        it('converts each segment into [a-z0-9_]', () => {
            expect(
                getComposeProjectName(
                    { id: namespaceId, name: 'Git PaaS.io' },
                    { id: projectId, name: '--My Web!!' },
                    { id: serviceId, name: 'Résumé v2' },
                ),
            ).toBe('git_paas_io_my_web_r_sum_v2');
        });

        it('holds no character outside [a-z0-9_]', () => {
            const name = getComposeProjectName(
                { id: namespaceId, name: 'Ünï Corp' },
                { id: projectId, name: 'Store 42' },
                { id: serviceId, name: 'Cart!' },
            );

            // eslint-disable-next-line optimize-regex/optimize-regex
            expect(/^[\da-z][\da-z_]*$/.test(name)).toBe(true);
        });

        it('falls back to namespace-<id> when the name of the namespace holds no usable character', () => {
            expect(
                getComposeProjectName(
                    { id: namespaceId, name: '!!!' },
                    { id: projectId, name: 'web' },
                    { id: serviceId, name: 'api' },
                ),
            ).toBe(`namespace-${namespaceId}_web_api`);
        });

        it('falls back to project-<id> when the name of the project holds no usable character', () => {
            expect(
                getComposeProjectName(
                    { id: namespaceId, name: 'gitpaas' },
                    { id: projectId, name: '   ' },
                    { id: serviceId, name: 'api' },
                ),
            ).toBe(`gitpaas_project-${projectId}_api`);
        });

        it('falls back to service-<id> when the name of the service holds no usable character', () => {
            expect(
                getComposeProjectName(
                    { id: namespaceId, name: 'gitpaas' },
                    { id: projectId, name: 'web' },
                    { id: serviceId, name: '###' },
                ),
            ).toBe(`gitpaas_web_service-${serviceId}`);
        });

        it('falls back to service when the service holds no identifier and its name holds no usable character', () => {
            expect(
                getComposeProjectName(
                    { id: namespaceId, name: 'gitpaas' },
                    { id: projectId, name: 'web' },
                    { name: '###' },
                ),
            ).toBe('gitpaas_web_service');
        });

        it('takes the name of a service that holds no identifier', () => {
            expect(
                getComposeProjectName(
                    { id: namespaceId, name: 'gitpaas' },
                    { id: projectId, name: 'web' },
                    { name: 'Resume' },
                ),
            ).toBe('gitpaas_web_resume');
        });

        it('never starts with a character Docker Compose refuses', () => {
            const name = getComposeProjectName(
                { id: namespaceId, name: '-- 9lives' },
                { id: projectId, name: 'web' },
                { id: serviceId, name: 'api' },
            );

            expect(/^[\da-z]/.test(name)).toBe(true);
        });

        it('gives two different names to two projects that carry one name in two namespaces', () => {
            const first = getComposeProjectName(
                { id: namespaceId, name: 'alpha' },
                { id: projectId, name: 'web' },
                { id: serviceId, name: 'api' },
            );
            const second = getComposeProjectName(
                { id: namespaceId, name: 'beta' },
                { id: projectId, name: 'web' },
                { id: serviceId, name: 'api' },
            );

            expect(first).not.toBe(second);
        });

        it('gives two different names to two services that live in one project', () => {
            const first = getComposeProjectName(
                { id: namespaceId, name: 'gitpaas' },
                { id: projectId, name: 'web' },
                { id: serviceId, name: 'api' },
            );
            const second = getComposeProjectName(
                { id: namespaceId, name: 'gitpaas' },
                { id: projectId, name: 'web' },
                { id: serviceId, name: 'worker' },
            );

            expect(first).not.toBe(second);
        });
    });
});
