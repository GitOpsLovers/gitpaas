import {
    getVolumeDaemonKeyFromNameUseCase,
    getVolumeDaemonKeyUseCase,
    getVolumeDaemonNameUseCase,
    GITPAAS_VOLUME_KEY_PREFIX,
} from '../get-volume-daemon-name.use-case';

const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

describe('getVolumeDaemonKeyUseCase', () => {
    it('builds the key from the prefix of GitPaaS and the id of the volume', () => {
        expect(getVolumeDaemonKeyUseCase(volumeId)).toBe(`${GITPAAS_VOLUME_KEY_PREFIX}${volumeId}`);
    });
});

describe('getVolumeDaemonNameUseCase', () => {
    it('prefixes the key with the name of the Compose project, as Compose does', () => {
        expect(getVolumeDaemonNameUseCase('api', 'gitpaas-1')).toBe('api_gitpaas-1');
    });

    it('keeps the key of a volume the Compose file declares', () => {
        expect(getVolumeDaemonNameUseCase('api', 'pgdata')).toBe('api_pgdata');
    });
});

describe('the uniqueness of the name of a volume on the daemon', () => {
    const composeProject = 'acme_shop';
    const sibling = 'c9d0e1f2-a3b4-4c5d-8e9f-0a1b2c3d4e5f';

    /** Builds the name a volume of GitPaaS carries on the daemon, from its identifier alone. */
    const daemonName = (id: string): string => getVolumeDaemonNameUseCase(composeProject, getVolumeDaemonKeyUseCase(id));

    it('gives two volumes of one Compose project two distinct names, because the key holds the identifier of the volume', () => {
        expect(daemonName(volumeId)).not.toBe(daemonName(sibling));
    });

    it('gives two volumes of two Compose projects two distinct names', () => {
        expect(daemonName(volumeId)).not.toBe(getVolumeDaemonNameUseCase('acme_blog', getVolumeDaemonKeyUseCase(volumeId)));
    });

    it('holds the prefix of the Compose project and the key of GitPaaS, which the teardown of a service reads back', () => {
        const name = daemonName(volumeId);

        expect(name).toBe(`${composeProject}_${GITPAAS_VOLUME_KEY_PREFIX}${volumeId}`);
        expect(getVolumeDaemonKeyFromNameUseCase(composeProject, name)).toBe(`${GITPAAS_VOLUME_KEY_PREFIX}${volumeId}`);
    });
});

describe('getVolumeDaemonKeyFromNameUseCase', () => {
    it('removes the prefix of the Compose project from the name of the daemon', () => {
        expect(getVolumeDaemonKeyFromNameUseCase('api', 'api_pgdata')).toBe('pgdata');
    });

    it('gives the name back when it carries no prefix of that Compose project', () => {
        expect(getVolumeDaemonKeyFromNameUseCase('api', 'other_pgdata')).toBe('other_pgdata');
    });
});
