import { getMetadataArgsStorage } from 'typeorm';

import { DbUserEntity } from '../db-user.entity';

/** Reads the declared options of one column of the users entity. */
const columnOptions = (propertyName: keyof DbUserEntity): Record<string, unknown> => {
    const column = getMetadataArgsStorage().columns.find(
        (candidate) => candidate.target === DbUserEntity && candidate.propertyName === propertyName,
    );

    if (!column) {
        throw new Error(`The entity declares no column "${propertyName}".`);
    }

    return { ...column.options };
};

describe('DbUserEntity', () => {
    it('maps to the table "users"', () => {
        const table = getMetadataArgsStorage().tables.find((candidate) => candidate.target === DbUserEntity);

        expect(table?.name).toBe('users');
    });

    it('declares the display name as a nullable text', () => {
        expect(columnOptions('displayName')).toMatchObject({ type: 'text', nullable: true });
    });

    it('declares the secret of the second factor as a nullable text', () => {
        expect(columnOptions('totpSecret')).toMatchObject({ type: 'text', nullable: true });
    });

    it('declares the instant of the second factor as a nullable timestamp with a time zone', () => {
        expect(columnOptions('totpEnabledAt')).toMatchObject({ type: 'timestamptz', nullable: true });
    });

    it('keeps the email address unique and never nullable', () => {
        expect(columnOptions('email')).toMatchObject({ type: 'text', unique: true });
        expect(columnOptions('email').nullable).toBeUndefined();
    });
});
