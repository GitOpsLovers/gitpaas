import {
    getVolumeDaemonKeyFromNameUseCase,
    getVolumeDaemonNameUseCase,
} from '../get-volume-daemon-name.use-case';

import { Service } from '@features/services/domain/models/service.models';

/** Builds a service fixture, overriding only the fields the name of a volume reads. */
const service = (overrides: Partial<Service> = {}): Service => ({
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    name: 'Resume',
    composeProject: 'namespace_project',
    ...overrides,
} as Service);

describe('getVolumeDaemonNameUseCase', () => {
    it('prefixes the key of the Compose file with the name of the Compose project, as Compose does', () => {
        expect(getVolumeDaemonNameUseCase(service(), 'pgdata')).toBe('namespace_project_pgdata');
    });

    it('never carries the slug of the service, because Compose prefixes the project alone', () => {
        expect(getVolumeDaemonNameUseCase(service({ name: 'Api', composeProject: 'api' }), 'pgdata'))
            .toBe('api_pgdata');
    });

    it('ignores the name of the service, so a name of a service that gives no slug changes nothing', () => {
        expect(getVolumeDaemonNameUseCase(service({ name: '!!!' }), 'pgdata')).toBe('namespace_project_pgdata');
    });
});

describe('the uniqueness of the name of a volume on the daemon', () => {
    const composeProject = 'acme_shop';
    const shop = service({ name: 'Web', composeProject });

    it('gives two keys of one service two distinct names', () => {
        expect(getVolumeDaemonNameUseCase(shop, 'pgdata')).not.toBe(getVolumeDaemonNameUseCase(shop, 'uploads'));
    });

    it('gives one key of two Compose projects two distinct names', () => {
        expect(getVolumeDaemonNameUseCase(shop, 'pgdata')).not.toBe(
            getVolumeDaemonNameUseCase(service({ name: 'Web', composeProject: 'acme_blog' }), 'pgdata'),
        );
    });

    it('gives back the key of the Compose file the name it built', () => {
        const name = getVolumeDaemonNameUseCase(shop, 'pgdata');

        expect(name).toBe(`${composeProject}_pgdata`);
        expect(getVolumeDaemonKeyFromNameUseCase(shop, name)).toBe('pgdata');
    });
});

describe('getVolumeDaemonKeyFromNameUseCase', () => {
    it('removes the prefix of the Compose project from the name of the daemon', () => {
        expect(getVolumeDaemonKeyFromNameUseCase(service({ name: 'Api', composeProject: 'acme' }), 'acme_pgdata'))
            .toBe('pgdata');
    });

    it('keeps the underscore of a key of the Compose file that holds one', () => {
        expect(getVolumeDaemonKeyFromNameUseCase(service({ name: 'Api', composeProject: 'acme' }), 'acme_pg_data'))
            .toBe('pg_data');
    });

    it('gives the name back when it carries no prefix of that Compose project', () => {
        expect(getVolumeDaemonKeyFromNameUseCase(service({ name: 'Api', composeProject: 'acme' }), 'other_pgdata'))
            .toBe('other_pgdata');
    });
});
