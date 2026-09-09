import { parseComposeEnvironmentUseCase } from '../parse-compose-environment.use-case';

describe('parseComposeEnvironmentUseCase', () => {
    it('reads the names and the values of the map form of the key environment', () => {
        const text = [
            'services:',
            '  web:',
            '    image: nginx',
            '    environment:',
            '      DATABASE_URL: postgres://localhost:5432/app',
            '      LOG_LEVEL: debug',
        ].join('\n');

        expect(parseComposeEnvironmentUseCase(text)).toEqual({
            DATABASE_URL: 'postgres://localhost:5432/app',
            LOG_LEVEL: 'debug',
        });
    });

    it('reads the names and the values of the list form of the key environment', () => {
        const text = [
            'services:',
            '  web:',
            '    environment:',
            '      - LOG_LEVEL=debug',
            '      - GREETING=hello=world',
        ].join('\n');

        expect(parseComposeEnvironmentUseCase(text)).toEqual({ LOG_LEVEL: 'debug', GREETING: 'hello=world' });
    });

    it('gives an empty value to a name of the list form that carries no value', () => {
        const text = 'services:\n  web:\n    environment:\n      - LOG_LEVEL\n';

        expect(parseComposeEnvironmentUseCase(text)).toEqual({ LOG_LEVEL: '' });
    });

    it('gives an empty value to a name of the map form that carries no value', () => {
        const text = 'services:\n  web:\n    environment:\n      LOG_LEVEL:\n';

        expect(parseComposeEnvironmentUseCase(text)).toEqual({ LOG_LEVEL: '' });
    });

    it('renders a value that YAML reads as a number or as a boolean as its text', () => {
        const text = 'services:\n  web:\n    environment:\n      PORT: 8080\n      DEBUG: true\n';

        expect(parseComposeEnvironmentUseCase(text)).toEqual({ PORT: '8080', DEBUG: 'true' });
    });

    it.each([
        ['      DATABASE_URL: ${DATABASE_URL}', 'DATABASE_URL'],
        ['      DATABASE_URL: ${DATABASE_URL:-fallback}', 'DATABASE_URL'],
        ['      DATABASE_URL: postgres://${HOST}:5432/app', 'DATABASE_URL'],
    ])('gives an empty value to the line %p, because GitPaaS resolves no reference', (line, name) => {
        const text = ['services:', '  web:', '    environment:', line].join('\n');

        expect(parseComposeEnvironmentUseCase(text)).toEqual({ [name]: '' });
    });

    it('gathers the names of every service of the compose file', () => {
        const text = [
            'services:',
            '  web:',
            '    environment:',
            '      LOG_LEVEL: debug',
            '  worker:',
            '    environment:',
            '      - QUEUE_URL=redis://cache:6379',
        ].join('\n');

        expect(parseComposeEnvironmentUseCase(text)).toEqual({ LOG_LEVEL: 'debug', QUEUE_URL: 'redis://cache:6379' });
    });

    it('keeps the value of the first service that declares a name several services share', () => {
        const text = [
            'services:',
            '  web:',
            '    environment:',
            '      LOG_LEVEL: debug',
            '  worker:',
            '    environment:',
            '      LOG_LEVEL: error',
        ].join('\n');

        expect(parseComposeEnvironmentUseCase(text)).toEqual({ LOG_LEVEL: 'debug' });
    });

    it('ignores the key env_file, because the parser reads the key environment alone', () => {
        const text = 'services:\n  web:\n    env_file:\n      - .env\n    environment:\n      LOG_LEVEL: debug\n';

        expect(parseComposeEnvironmentUseCase(text)).toEqual({ LOG_LEVEL: 'debug' });
    });

    it.each([
        ['a service that declares no environment', 'services:\n  web:\n    image: nginx\n'],
        ['a compose file that declares no service', 'version: "3.9"\n'],
        ['a compose file with an empty block of services', 'services:\n'],
        ['an empty text', ''],
    ])('returns no name for %s', (_case, text) => {
        expect(parseComposeEnvironmentUseCase(text)).toEqual({});
    });

    it('returns no name when the key environment carries a scalar instead of a block of entries', () => {
        const text = 'services:\n  web:\n    environment: nonsense\n';

        expect(parseComposeEnvironmentUseCase(text)).toEqual({});
    });

    it('throws when the text is no valid YAML', () => {
        expect(() => parseComposeEnvironmentUseCase('services:\n  web:\n   - broken\n     nope: [')).toThrow();
    });
});
