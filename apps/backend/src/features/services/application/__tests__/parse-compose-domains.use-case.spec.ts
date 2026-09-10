import { parseComposeDomainsUseCase } from '../parse-compose-domains.use-case';

describe('parseComposeDomainsUseCase', () => {
    it('reads the host, the port and the flag https of the key x-gitpaas-domain of a service', () => {
        const text = [
            'services:',
            '  web:',
            '    image: nginx',
            '    x-gitpaas-domain:',
            '      host: app.example.com',
            '      port: 8080',
            '      https: true',
        ].join('\n');

        expect(parseComposeDomainsUseCase(text)).toEqual([
            {
                targetService: 'web', host: 'app.example.com', port: 8080, https: true,
            },
        ]);
    });

    it('names the compose service that carries the key as the target of the domain', () => {
        const text = [
            'services:',
            '  api:',
            '    x-gitpaas-domain:',
            '      host: api.example.com',
            '      port: 3000',
            '      https: false',
        ].join('\n');

        expect(parseComposeDomainsUseCase(text)[0].targetService).toBe('api');
    });

    it('reads the key of every service of the compose file', () => {
        const text = [
            'services:',
            '  web:',
            '    x-gitpaas-domain:',
            '      host: app.example.com',
            '      port: 80',
            '      https: true',
            '  api:',
            '    x-gitpaas-domain:',
            '      host: api.example.com',
            '      port: 3000',
            '      https: true',
        ].join('\n');

        expect(parseComposeDomainsUseCase(text)).toEqual([
            {
                targetService: 'web', host: 'app.example.com', port: 80, https: true,
            },
            {
                targetService: 'api', host: 'api.example.com', port: 3000, https: true,
            },
        ]);
    });

    it('writes the host of a declaration in small letters, and trims it', () => {
        const text = [
            'services:',
            '  web:',
            '    x-gitpaas-domain:',
            '      host: "  App.Example.COM  "',
            '      port: 80',
            '      https: true',
        ].join('\n');

        expect(parseComposeDomainsUseCase(text)[0].host).toBe('app.example.com');
    });

    it('keeps the declaration of the first service alone when two services claim one host', () => {
        const text = [
            'services:',
            '  web:',
            '    x-gitpaas-domain:',
            '      host: app.example.com',
            '      port: 80',
            '      https: true',
            '  legacy:',
            '    x-gitpaas-domain:',
            '      host: app.example.com',
            '      port: 8080',
            '      https: false',
        ].join('\n');

        expect(parseComposeDomainsUseCase(text)).toEqual([
            {
                targetService: 'web', host: 'app.example.com', port: 80, https: true,
            },
        ]);
    });

    it('reads every declaration of the list of one service, and names that service as the target of each one', () => {
        const text = [
            'services:',
            '  minio:',
            '    x-gitpaas-domain:',
            '      - host: s3.example.com',
            '        port: 9000',
            '        https: true',
            '      - host: console.example.com',
            '        port: 9001',
            '        https: true',
        ].join('\n');

        expect(parseComposeDomainsUseCase(text)).toEqual([
            {
                targetService: 'minio', host: 's3.example.com', port: 9000, https: true,
            },
            {
                targetService: 'minio', host: 'console.example.com', port: 9001, https: true,
            },
        ]);
    });

    it('reads an empty list as no declaration at all', () => {
        const text = 'services:\n  web:\n    image: nginx\n    x-gitpaas-domain: []\n';

        expect(parseComposeDomainsUseCase(text)).toEqual([]);
    });

    it('keeps the first declaration alone when one list repeats a host', () => {
        const text = [
            'services:',
            '  minio:',
            '    x-gitpaas-domain:',
            '      - host: s3.example.com',
            '        port: 9000',
            '        https: true',
            '      - host: s3.example.com',
            '        port: 9001',
            '        https: false',
        ].join('\n');

        expect(parseComposeDomainsUseCase(text)).toEqual([
            {
                targetService: 'minio', host: 's3.example.com', port: 9000, https: true,
            },
        ]);
    });

    it('skips a whole list where one entry breaks the schema', () => {
        const text = [
            'services:',
            '  minio:',
            '    x-gitpaas-domain:',
            '      - host: s3.example.com',
            '        port: 9000',
            '        https: true',
            '      - host: localhost',
            '        port: 9001',
            '        https: true',
        ].join('\n');

        expect(parseComposeDomainsUseCase(text)).toEqual([]);
    });

    it('skips a service that declares no domain at all', () => {
        const text = 'services:\n  web:\n    image: nginx\n';

        expect(parseComposeDomainsUseCase(text)).toEqual([]);
    });

    it.each([
        ['a host of one label alone', '      host: localhost\n      port: 80\n      https: true'],
        ['a port outside the range', '      host: app.example.com\n      port: 70000\n      https: true'],
        ['a port that is no number', '      host: app.example.com\n      port: web\n      https: true'],
        ['no flag https', '      host: app.example.com\n      port: 80'],
        ['no host', '      port: 80\n      https: true'],
        ['a key the schema does not know', '      host: app.example.com\n      port: 80\n      https: true\n      path: /api'],
    ])('skips a declaration that carries %s', (_case, block) => {
        const text = `services:\n  web:\n    x-gitpaas-domain:\n${block}\n`;

        expect(parseComposeDomainsUseCase(text)).toEqual([]);
    });

    it('skips a declaration that is no block of keys', () => {
        const text = 'services:\n  web:\n    x-gitpaas-domain: app.example.com\n';

        expect(parseComposeDomainsUseCase(text)).toEqual([]);
    });

    it('returns no domain when the compose file declares no service', () => {
        expect(parseComposeDomainsUseCase('version: "3.9"\n')).toEqual([]);
    });

    it('returns no domain when the text holds no map at all', () => {
        expect(parseComposeDomainsUseCase('a plain line\n')).toEqual([]);
    });

    it('throws when the text is no valid YAML', () => {
        expect(() => parseComposeDomainsUseCase('services:\n  web:\n   - broken\n     nope: [')).toThrow();
    });
});
