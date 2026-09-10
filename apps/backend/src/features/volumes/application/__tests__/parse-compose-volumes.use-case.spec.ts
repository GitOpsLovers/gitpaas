import { parseComposeVolumesUseCase } from '../parse-compose-volumes.use-case';

/** Joins the lines of a compose file fixture into the text the parser reads. */
const compose = (...lines: string[]): string => `${lines.join('\n')}\n`;

describe('parseComposeVolumesUseCase', () => {
    it('reads the key of every named volume of the top-level block volumes', () => {
        const text = compose('volumes:', '  data:', '  uploads:');

        expect(parseComposeVolumesUseCase(text)).toEqual([
            { daemonKey: 'data', mount: null },
            { daemonKey: 'uploads', mount: null },
        ]);
    });

    it('reads the mount of the short form of an entry of a compose service', () => {
        const text = compose(
            'services:',
            '  app:',
            '    volumes:',
            '      - data:/var/lib/app',
            'volumes:',
            '  data:',
        );

        expect(parseComposeVolumesUseCase(text)).toEqual([
            { daemonKey: 'data', mount: { composeServiceName: 'app', containerPath: '/var/lib/app', readOnly: false } },
        ]);
    });

    it('gives the mount the mode read-only when the short form carries the option ro', () => {
        const text = compose('services:', '  app:', '    volumes:', '      - data:/var/lib/app:ro');

        expect(parseComposeVolumesUseCase(text)[0]?.mount?.readOnly).toBe(true);
    });

    it('reads the mount of the long form of an entry of a compose service', () => {
        const text = compose(
            'services:',
            '  app:',
            '    volumes:',
            '      - type: volume',
            '        source: data',
            '        target: /var/lib/app',
            '        read_only: true',
        );

        expect(parseComposeVolumesUseCase(text)).toEqual([
            { daemonKey: 'data', mount: { composeServiceName: 'app', containerPath: '/var/lib/app', readOnly: true } },
        ]);
    });

    it('names the compose service that mounts the volume', () => {
        const text = compose('services:', '  worker:', '    volumes:', '      - data:/data');

        expect(parseComposeVolumesUseCase(text)[0]?.mount?.composeServiceName).toBe('worker');
    });

    it('keeps the first mount alone when two compose services mount one volume', () => {
        const text = compose(
            'services:',
            '  app:',
            '    volumes:',
            '      - data:/var/lib/app',
            '  worker:',
            '    volumes:',
            '      - data:/srv/data',
        );

        expect(parseComposeVolumesUseCase(text)).toEqual([
            { daemonKey: 'data', mount: { composeServiceName: 'app', containerPath: '/var/lib/app', readOnly: false } },
        ]);
    });

    it('declares a volume of the top-level block that no compose service mounts', () => {
        const text = compose(
            'services:',
            '  app:',
            '    volumes:',
            '      - data:/var/lib/app',
            'volumes:',
            '  data:',
            '  backups:',
        );

        expect(parseComposeVolumesUseCase(text)).toContainEqual({ daemonKey: 'backups', mount: null });
    });

    it('never declares a bind mount of a relative source', () => {
        const text = compose('services:', '  app:', '    volumes:', '      - ./config:/etc/app');

        expect(parseComposeVolumesUseCase(text)).toEqual([]);
    });

    it('never declares a bind mount of a path of the host', () => {
        const text = compose('services:', '  app:', '    volumes:', '      - /srv/data:/var/lib/app');

        expect(parseComposeVolumesUseCase(text)).toEqual([]);
    });

    it('never declares a bind mount of the home folder', () => {
        const text = compose('services:', '  app:', '    volumes:', '      - ~/data:/var/lib/app');

        expect(parseComposeVolumesUseCase(text)).toEqual([]);
    });

    it('never declares a bind mount of the long form', () => {
        const text = compose(
            'services:',
            '  app:',
            '    volumes:',
            '      - type: bind',
            '        source: ./config',
            '        target: /etc/app',
        );

        expect(parseComposeVolumesUseCase(text)).toEqual([]);
    });

    it('never declares the anonymous volume of a lone path', () => {
        const text = compose('services:', '  app:', '    volumes:', '      - /var/lib/app');

        expect(parseComposeVolumesUseCase(text)).toEqual([]);
    });

    it('declares the volume a compose service mounts, and the top-level block never names', () => {
        const text = compose('services:', '  app:', '    volumes:', '      - data:/var/lib/app');

        expect(parseComposeVolumesUseCase(text)).toEqual([
            { daemonKey: 'data', mount: { composeServiceName: 'app', containerPath: '/var/lib/app', readOnly: false } },
        ]);
    });

    it('gives an empty list when the compose file declares no volume', () => {
        expect(parseComposeVolumesUseCase(compose('services:', '  app:', '    image: nginx'))).toEqual([]);
    });

    it('gives an empty list when the text carries no mapping', () => {
        expect(parseComposeVolumesUseCase('- one\n- two\n')).toEqual([]);
        expect(parseComposeVolumesUseCase('')).toEqual([]);
    });

    it('gives an empty list when the block volumes carries a list, which compose never writes', () => {
        expect(parseComposeVolumesUseCase(compose('volumes:', '  - data'))).toEqual([]);
    });

    it('throws when the text is no valid YAML', () => {
        expect(() => parseComposeVolumesUseCase('services: [web')).toThrow();
    });
});
