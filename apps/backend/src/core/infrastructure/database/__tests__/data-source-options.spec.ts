import { buildDataSourceOptions } from '../data-source-options';

// eslint-disable-next-line no-secrets/no-secrets
describe('buildDataSourceOptions', () => {
    let envBackup: NodeJS.ProcessEnv;

    beforeEach(() => {
        envBackup = { ...process.env };

        process.env.DB_HOST = 'db.internal';
        process.env.DB_PORT = '5433';
        process.env.DB_USER = 'gitpaas';
        process.env.DB_PASSWORD = 's3cr3t';
        process.env.DB_NAME = 'gitpaas_db';
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        process.env = envBackup;
    });

    it('targets postgres', () => {
        expect(buildDataSourceOptions().type).toBe('postgres');
    });

    it('maps the DB_* env vars into the connection options', () => {
        const options = buildDataSourceOptions();

        expect(options).toMatchObject({
            host: 'db.internal',
            port: 5433,
            username: 'gitpaas',
            password: 's3cr3t',
            database: 'gitpaas_db',
        });
    });

    it('coerces DB_PORT to a number', () => {
        const { port } = buildDataSourceOptions();

        expect(port).toBe(5433);
        expect(typeof port).toBe('number');
    });

    it('enables synchronize in development', () => {
        process.env.NODE_ENV = 'development';

        expect(buildDataSourceOptions().synchronize).toBe(true);
    });

    it('enables synchronize in test', () => {
        process.env.NODE_ENV = 'test';

        expect(buildDataSourceOptions().synchronize).toBe(true);
    });

    it('disables synchronize in production', () => {
        process.env.NODE_ENV = 'production';

        expect(buildDataSourceOptions().synchronize).toBe(false);
    });

    it('registers a non-empty entity glob', () => {
        const { entities } = buildDataSourceOptions();

        expect(Array.isArray(entities)).toBe(true);
        expect(entities).toHaveLength(1);
        expect(entities?.[0]).toMatch(/\*\.entity\.(ts|js)$/);
    });

    // The backend owns no migration machinery: production schema lives in the
    // SQL files under iac/production/migrations/, applied by the installer.
    it('registers no migrations at all', () => {
        const options = buildDataSourceOptions();

        expect(options.migrations).toBeUndefined();
        expect(options.migrationsRun).toBeUndefined();
    });
});
