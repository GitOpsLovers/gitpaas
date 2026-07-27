import { Argon2PasswordHasher } from '../argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
    let hasher: Argon2PasswordHasher;

    beforeEach(() => {
        hasher = new Argon2PasswordHasher();
    });

    it('hashes a password into an argon2id digest that is not the plaintext', async () => {
        const hash = await hasher.hash('s3cret-password');

        expect(hash).not.toBe('s3cret-password');
        expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('produces distinct salted hashes for the same password', async () => {
        const [a, b] = await Promise.all([hasher.hash('same-password'), hasher.hash('same-password')]);

        expect(a).not.toBe(b);
    });

    it('verifies a password against its own hash', async () => {
        const hash = await hasher.hash('correct-horse-battery-staple');

        expect(await hasher.verify(hash, 'correct-horse-battery-staple')).toBe(true);
    });

    it('rejects a password that does not match the hash', async () => {
        const hash = await hasher.hash('correct-horse-battery-staple');

        expect(await hasher.verify(hash, 'wrong-password')).toBe(false);
    });

    it('returns false instead of throwing when the stored hash is malformed', async () => {
        expect(await hasher.verify('not-a-valid-argon2-hash', 'anything')).toBe(false);
    });
});
