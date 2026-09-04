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

describe('getVolumeDaemonKeyFromNameUseCase', () => {
    it('removes the prefix of the Compose project from the name of the daemon', () => {
        expect(getVolumeDaemonKeyFromNameUseCase('api', 'api_pgdata')).toBe('pgdata');
    });

    it('gives the name back when it carries no prefix of that Compose project', () => {
        expect(getVolumeDaemonKeyFromNameUseCase('api', 'other_pgdata')).toBe('other_pgdata');
    });
});
