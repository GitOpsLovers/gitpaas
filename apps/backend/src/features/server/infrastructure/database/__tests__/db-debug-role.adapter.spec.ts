import { DataSource } from 'typeorm';

import { DatabaseDebugRoleAdapter } from '../db-debug-role.adapter';

describe('DatabaseDebugRoleAdapter', () => {
    let mockQuery: jest.Mock;
    let mockDataSource: jest.Mocked<Pick<DataSource, 'query'>>;
    let sut: DatabaseDebugRoleAdapter;

    /** Reads the single statement the adapter sent on the call of the index given. */
    // eslint-disable-next-line security/detect-object-injection
    const statementOf = (call = 0): string => mockQuery.mock.calls[call][0] as string;

    beforeEach(() => {
        jest.clearAllMocks();

        mockQuery = jest.fn().mockResolvedValue([]);
        mockDataSource = { query: mockQuery };
        sut = new DatabaseDebugRoleAdapter(mockDataSource as unknown as DataSource);
    });

    describe('grantLogin', () => {
        it('returns the name of the read-only role of the platform', async () => {
            await expect(sut.grantLogin()).resolves.toEqual(
                expect.objectContaining({ role: 'gitpaas_debug' }),
            );
        });

        it('generates a password of forty-eight hexadecimal characters', async () => {
            const { password } = await sut.grantLogin();

            // eslint-disable-next-line optimize-regex/optimize-regex
            expect(password).toMatch(/^[0-9a-f]{48}$/);
        });

        it('generates a different password on every call', async () => {
            const first = await sut.grantLogin();
            const second = await sut.grantLogin();

            expect(first.password).not.toBe(second.password);
        });

        it('sends one statement alone, which grants the login and writes the generated password', async () => {
            const { password } = await sut.grantLogin();

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery).toHaveBeenCalledWith(
                `ALTER ROLE "gitpaas_debug" WITH LOGIN PASSWORD '${password}'`,
            );
        });

        it('never creates the role, and never grants a privilege of its own', async () => {
            await sut.grantLogin();

            expect(statementOf()).not.toMatch(/CREATE ROLE|GRANT |ALTER DEFAULT PRIVILEGES/);
        });

        it('propagates the error of the database', async () => {
            mockQuery.mockRejectedValue(new Error('permission denied'));

            await expect(sut.grantLogin()).rejects.toThrow('permission denied');
        });
    });

    describe('revokeLogin', () => {
        it('sends one statement alone, which sets the role back to NOLOGIN', async () => {
            await sut.revokeLogin();

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery).toHaveBeenCalledWith('ALTER ROLE "gitpaas_debug" WITH NOLOGIN');
        });

        it('never carries a password in the statement of the revocation', async () => {
            await sut.revokeLogin();

            expect(statementOf()).not.toMatch(/PASSWORD/);
        });

        it('propagates the error of the database', async () => {
            mockQuery.mockRejectedValue(new Error('role does not exist'));

            await expect(sut.revokeLogin()).rejects.toThrow('role does not exist');
        });
    });
});
