import { SECRET_MASK, maskSecretValuesUseCase } from '../mask-secret-values.use-case';

describe('maskSecretValuesUseCase', () => {
    it('returns the line unchanged when the service holds no secret', () => {
        expect(maskSecretValuesUseCase('listening on 3000', [])).toBe('listening on 3000');
    });

    it('replaces the value of a secret with the mask', () => {
        expect(maskSecretValuesUseCase('token=s3cr3t-value', ['s3cr3t-value'])).toBe(`token=${SECRET_MASK}`);
    });

    it('replaces every occurrence of the same value in one line', () => {
        const line = maskSecretValuesUseCase('s3cr3t and s3cr3t again', ['s3cr3t']);

        expect(line).toBe(`${SECRET_MASK} and ${SECRET_MASK} again`);
    });

    it('replaces the value of every secret of the service', () => {
        const line = maskSecretValuesUseCase('user=admin password=hunter2 token=abcdef', ['hunter2', 'abcdef']);

        expect(line).toBe(`user=admin password=${SECRET_MASK} token=${SECRET_MASK}`);
    });

    it('hides the longest value whole when one secret holds another', () => {
        const line = maskSecretValuesUseCase('key=abc-1234567890', ['abc', 'abc-1234567890']);

        expect(line).toBe(`key=${SECRET_MASK}`);
    });

    it('never masks the whole line when a secret carries an empty value', () => {
        expect(maskSecretValuesUseCase('build finished', [''])).toBe('build finished');
    });

    it('masks a value that a longer text of the line embeds', () => {
        expect(maskSecretValuesUseCase('url=postgres://user:hunter2@db/app', ['hunter2']))
            .toBe(`url=postgres://user:${SECRET_MASK}@db/app`);
    });

    it('never treats the value of a secret as a pattern of a regular expression', () => {
        expect(maskSecretValuesUseCase('key=a.c and abc', ['a.c'])).toBe(`key=${SECRET_MASK} and abc`);
    });
});
