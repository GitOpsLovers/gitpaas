import { assertComposerPath } from '../assert-composer-path.use-case';

import { UnsafeComposeRecipeError } from '@core/domain/errors/compose.errors';

describe('assertComposerPath', () => {
    it.each(['docker-compose.yml', './compose.yaml', 'stacks/production/compose.yml', 'a..b/compose.yml'])(
        'accepts the relative path %p',
        (path) => {
            expect(() => { assertComposerPath(path); }).not.toThrow();
        },
    );

    it.each([
        '/etc/passwd',
        '~/compose.yml',
        '../../etc/compose.yml',
        'stacks/../../compose.yml',
        '..',
        '',
    ])('refuses the path %p, because it escapes the repository', (path) => {
        expect(() => { assertComposerPath(path); }).toThrow(UnsafeComposeRecipeError);
    });

    it('names the key composerPath on the error', () => {
        try {
            assertComposerPath('../compose.yml');
            throw new Error('The check accepted the path.');
        } catch (error) {
            // eslint-disable-next-line jest/no-conditional-expect
            expect((error as UnsafeComposeRecipeError).key).toBe('composerPath');
        }
    });
});
