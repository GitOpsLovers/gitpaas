import { serviceProjectNameUseCase } from '../service-project-name.use-case';

describe('service-project-name.use-case', () => {
    describe('serviceProjectNameUseCase', () => {
        it('slugifies the service name', () => {
            expect(serviceProjectNameUseCase({ id: 'abc', name: 'My Service!' })).toBe('my-service');
        });

        it('trims leading and trailing separators', () => {
            expect(serviceProjectNameUseCase({ id: 'abc', name: '--Web App--' })).toBe('web-app');
        });

        it.each([
            ['lowercases uppercase names', 'CHECKOUT', 'checkout'],
            ['collapses a run of separators into a single dash', 'Web   //  App', 'web-app'],
            ['treats underscores as separators', 'my_app', 'my-app'],
            ['keeps digits', 'api2 v3', 'api2-v3'],
            ['replaces dots between segments', 'v2.1 Release', 'v2-1-release'],
            ['drops non-ascii characters', 'Café', 'caf'],
            ['leaves an already-slugified name untouched', 'billing-svc', 'billing-svc'],
        ])('%s', (_case, name, expected) => {
            expect(serviceProjectNameUseCase({ id: 'abc', name })).toBe(expected);
        });

        it.each([
            ['punctuation only', '!!!'],
            ['whitespace only', '   '],
            ['empty', ''],
            ['non-ascii only', '日本語'],
        ])('falls back to service-<id> when the name is %s', (_case, name) => {
            expect(serviceProjectNameUseCase({ id: 'abc', name })).toBe('service-abc');
        });

        it('ignores the extra arguments Array.prototype.map passes it', () => {
            const services = [{ id: 'abc', name: 'Checkout API' }, { id: 'def', name: '!!!' }];

            expect(services.map(serviceProjectNameUseCase)).toEqual(['checkout-api', 'service-def']);
        });
    });
});
