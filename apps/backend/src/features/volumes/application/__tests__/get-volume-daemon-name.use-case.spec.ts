import {
    getVolumeDaemonKeyFromNameUseCase,
    getVolumeDaemonKeyUseCase,
    getVolumeDaemonNameUseCase,
    GITPAAS_VOLUME_KEY_PREFIX,
} from '../get-volume-daemon-name.use-case';

import { Service } from '@features/services/domain/models/service.models';

const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

/** Builds a service fixture, overriding only the fields the name of a volume reads. */
const service = (overrides: Partial<Service> = {}): Service => ({
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    name: 'Resume',
    composeProject: 'namespace_project',
    ...overrides,
} as Service);

describe('getVolumeDaemonKeyUseCase', () => {
    it('builds the key from the prefix of GitPaaS and the id of the volume', () => {
        expect(getVolumeDaemonKeyUseCase(volumeId)).toBe(`${GITPAAS_VOLUME_KEY_PREFIX}${volumeId}`);
    });
});

describe('getVolumeDaemonNameUseCase', () => {
    it('prefixes the key with the Compose project and the slug of the service', () => {
        expect(getVolumeDaemonNameUseCase(service(), 'gitpaas-1')).toBe('namespace_project_resume_gitpaas-1');
    });

    it('keeps the key of a volume the Compose file declares', () => {
        expect(getVolumeDaemonNameUseCase(service({ name: 'Api', composeProject: 'api' }), 'pgdata'))
            .toBe('api_api_pgdata');
    });

    it('falls back to the identifier of the service when its name gives an empty slug', () => {
        const empty = service({ name: '!!!' });

        expect(getVolumeDaemonNameUseCase(empty, 'gitpaas-1'))
            .toBe(`namespace_project_service-${empty.id}_gitpaas-1`);
    });
});

describe('the uniqueness of the name of a volume on the daemon', () => {
    const composeProject = 'acme_shop';
    const sibling = 'c9d0e1f2-a3b4-4c5d-8e9f-0a1b2c3d4e5f';
    const shop = service({ name: 'Web', composeProject });

    /** Builds the name a volume of GitPaaS carries on the daemon, from its identifier alone. */
    const daemonName = (id: string): string => getVolumeDaemonNameUseCase(shop, getVolumeDaemonKeyUseCase(id));

    it('gives two volumes of one service two distinct names, because the key holds the identifier of the volume', () => {
        expect(daemonName(volumeId)).not.toBe(daemonName(sibling));
    });

    it('gives two volumes of two Compose projects two distinct names', () => {
        expect(daemonName(volumeId)).not.toBe(
            getVolumeDaemonNameUseCase(service({ name: 'Web', composeProject: 'acme_blog' }), getVolumeDaemonKeyUseCase(volumeId)),
        );
    });

    it('gives two volumes of two services of one Compose project two distinct names', () => {
        expect(daemonName(volumeId)).not.toBe(
            getVolumeDaemonNameUseCase(service({ name: 'Worker', composeProject }), getVolumeDaemonKeyUseCase(volumeId)),
        );
    });

    it('holds the prefix of the service and the key of GitPaaS, which the teardown of a service reads back', () => {
        const name = daemonName(volumeId);

        expect(name).toBe(`${composeProject}_web_${GITPAAS_VOLUME_KEY_PREFIX}${volumeId}`);
        expect(getVolumeDaemonKeyFromNameUseCase(shop, name)).toBe(`${GITPAAS_VOLUME_KEY_PREFIX}${volumeId}`);
    });
});

describe('getVolumeDaemonKeyFromNameUseCase', () => {
    it('removes the prefix of the Compose project and of the service from the name of the daemon', () => {
        expect(getVolumeDaemonKeyFromNameUseCase(service({ name: 'Api', composeProject: 'acme' }), 'acme_api_pgdata'))
            .toBe('pgdata');
    });

    it('gives the name back when it carries no prefix of that Compose project', () => {
        expect(getVolumeDaemonKeyFromNameUseCase(service({ name: 'Api', composeProject: 'acme' }), 'other_api_pgdata'))
            .toBe('other_api_pgdata');
    });

    it('gives the name back when it carries the prefix of another service of that Compose project', () => {
        expect(getVolumeDaemonKeyFromNameUseCase(service({ name: 'Api', composeProject: 'acme' }), 'acme_worker_pgdata'))
            .toBe('acme_worker_pgdata');
    });
});
