import {
    attachVolumeSchema,
    createVolumeSchema,
    isSystemMountPath,
    updateVolumeSchema,
    VOLUME_NAME_MAX_LENGTH,
    volumeSchema,
} from '../volume.contract';

/** Builds the body that creates a volume, overriding only the fields under test. */
const createBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'data',
    composeServiceName: 'app',
    containerPath: '/var/lib/postgresql/data',
    readOnly: false,
    ...overrides,
});

describe('volumeSchema', () => {
    it('accepts a volume that carries every optional field', () => {
        const volume = {
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            name: 'data',
            daemonName: 'api_gitpaas-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            origin: 'gitpaas',
            state: 'mounted',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/api_data/_data',
            mount: { composeServiceName: 'app', containerPath: '/data', readOnly: false },
            containers: ['api-app-1'],
        };

        expect(volumeSchema.safeParse(volume).success).toBe(true);
    });

    it('refuses a state that the tab does not show', () => {
        const volume = {
            id: 'data', name: 'data', daemonName: 'api_data', origin: 'compose', state: 'running', containers: [],
        };

        expect(volumeSchema.safeParse(volume).success).toBe(false);
    });
});

describe('createVolumeSchema', () => {
    it('accepts a valid body', () => {
        expect(createVolumeSchema.safeParse(createBody()).success).toBe(true);
    });

    it('puts the name into small letters, so one service cannot hold it in two forms', () => {
        expect(createVolumeSchema.parse(createBody({ name: 'Data' })).name).toBe('data');
    });

    it('trims the spaces around the name', () => {
        expect(createVolumeSchema.parse(createBody({ name: '  data  ' })).name).toBe('data');
    });

    it('reads the mode read-only as false when the body carries none', () => {
        const body = createBody();

        delete body.readOnly;

        expect(createVolumeSchema.parse(body).readOnly).toBe(false);
    });

    it('refuses an empty name', () => {
        expect(createVolumeSchema.safeParse(createBody({ name: '' })).success).toBe(false);
    });

    it('refuses a name that carries a character beyond the letters, the numbers and the hyphen', () => {
        expect(createVolumeSchema.safeParse(createBody({ name: 'my_data' })).success).toBe(false);
    });

    it('accepts a name of the greatest length', () => {
        const name = 'a'.repeat(VOLUME_NAME_MAX_LENGTH);

        expect(createVolumeSchema.safeParse(createBody({ name })).success).toBe(true);
    });

    it('refuses a name longer than the greatest length', () => {
        const name = 'a'.repeat(VOLUME_NAME_MAX_LENGTH + 1);

        expect(createVolumeSchema.safeParse(createBody({ name })).success).toBe(false);
    });

    it('refuses a property that the body does not declare', () => {
        expect(createVolumeSchema.safeParse(createBody({ driver: 'local' })).success).toBe(false);
    });

    it('refuses a name of a service of the Compose file that starts with the hyphen', () => {
        expect(createVolumeSchema.safeParse(createBody({ composeServiceName: '-app' })).success).toBe(false);
    });

    it('accepts a name of a service of the Compose file that carries the underscore and the dot', () => {
        expect(createVolumeSchema.safeParse(createBody({ composeServiceName: 'api_v1.0' })).success).toBe(true);
    });
});

describe('volumeContainerPath', () => {
    it('accepts an absolute path of one segment', () => {
        expect(createVolumeSchema.safeParse(createBody({ containerPath: '/data' })).success).toBe(true);
    });

    it('refuses a relative path', () => {
        expect(createVolumeSchema.safeParse(createBody({ containerPath: 'data' })).success).toBe(false);
    });

    it('refuses the root', () => {
        expect(createVolumeSchema.safeParse(createBody({ containerPath: '/' })).success).toBe(false);
    });

    it('refuses a path that ends with the slash', () => {
        expect(createVolumeSchema.safeParse(createBody({ containerPath: '/data/' })).success).toBe(false);
    });

    it('refuses a path that holds an empty segment', () => {
        expect(createVolumeSchema.safeParse(createBody({ containerPath: '/data//files' })).success).toBe(false);
    });

    it('refuses a path that holds a space', () => {
        expect(createVolumeSchema.safeParse(createBody({ containerPath: '/my data' })).success).toBe(false);
    });

    it('refuses a path of the system', () => {
        expect(createVolumeSchema.safeParse(createBody({ containerPath: '/etc' })).success).toBe(false);
    });

    it('accepts a path under a path of the system', () => {
        expect(createVolumeSchema.safeParse(createBody({ containerPath: '/var/lib/data' })).success).toBe(true);
    });
});

describe('isSystemMountPath', () => {
    it('tells that a path of the system is one', () => {
        expect(isSystemMountPath('/proc')).toBe(true);
    });

    it('tells that a path of the data is no path of the system', () => {
        expect(isSystemMountPath('/var/lib/data')).toBe(false);
    });
});

describe('attachVolumeSchema', () => {
    it('accepts a valid body', () => {
        const body = { composeServiceName: 'app', containerPath: '/data', readOnly: true };

        expect(attachVolumeSchema.safeParse(body).success).toBe(true);
    });

    it('refuses the name of the volume, which the attach never changes', () => {
        const body = {
            composeServiceName: 'app', containerPath: '/data', readOnly: true, name: 'data',
        };

        expect(attachVolumeSchema.safeParse(body).success).toBe(false);
    });
});

describe('updateVolumeSchema', () => {
    it('accepts a body that carries the new name alone', () => {
        expect(updateVolumeSchema.safeParse({ name: 'archive' }).success).toBe(true);
    });

    it('refuses a body that carries the mount path', () => {
        expect(updateVolumeSchema.safeParse({ name: 'archive', containerPath: '/data' }).success).toBe(false);
    });
});
