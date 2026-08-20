/* eslint-disable jest/no-conditional-expect */
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../zod-validation.pipe';

/** Schema of a body with one obligatory text, one number and one nested object. */
const bodySchema = z.strictObject({
    name: z.string().min(1),
    port: z.number().int(),
    owner: z.strictObject({ email: z.email() }),
});

/** Builds a payload that satisfies `bodySchema`, overriding only the fields under test. */
const payload = (overrides: Record<string, unknown> = {}): unknown => ({
    name: 'gitpaas',
    port: 8080,
    owner: { email: 'ops@gitpaas.dev' },
    ...overrides,
});

describe('ZodValidationPipe', () => {
    it('returns the parsed value when the payload satisfies the schema', () => {
        const sut = new ZodValidationPipe(bodySchema);

        const result = sut.transform(payload());

        expect(result).toEqual({ name: 'gitpaas', port: 8080, owner: { email: 'ops@gitpaas.dev' } });
    });

    it('returns the value the schema converts, and not the raw one', () => {
        const sut = new ZodValidationPipe(z.strictObject({ name: z.string().trim() }));

        const result = sut.transform({ name: '  gitpaas  ' });

        expect(result).toEqual({ name: 'gitpaas' });
    });

    it('throws a BadRequestException when the payload does not satisfy the schema', () => {
        const sut = new ZodValidationPipe(bodySchema);

        expect(() => sut.transform(payload({ name: '' }))).toThrow(BadRequestException);
    });

    it('carries one message for each failed property, as an array', () => {
        const sut = new ZodValidationPipe(bodySchema);

        try {
            sut.transform(payload({ name: '', port: 'nope' }));
            throw new Error('the pipe accepted an invalid payload');
        } catch (error) {
            const response = (error as BadRequestException).getResponse() as { message: string[] };

            expect(Array.isArray(response.message)).toBe(true);
            expect(response.message).toHaveLength(2);
            expect(response.message[0]).toContain('name');
            expect(response.message[1]).toContain('port');
        }
    });

    it('keeps the envelope of the ValidationPipe of Nest', () => {
        const sut = new ZodValidationPipe(bodySchema);

        try {
            sut.transform(payload({ port: 'nope' }));
            throw new Error('the pipe accepted an invalid payload');
        } catch (error) {
            const exception = error as BadRequestException;

            expect(exception.getStatus()).toBe(400);
            expect(exception.getResponse()).toEqual({
                statusCode: 400,
                message: [expect.stringContaining('port') as unknown as string],
                error: 'Bad Request',
            });
        }
    });

    it('prefixes the message of a nested property with its full path', () => {
        const sut = new ZodValidationPipe(bodySchema);

        try {
            sut.transform(payload({ owner: { email: 'not-an-email' } }));
            throw new Error('the pipe accepted an invalid payload');
        } catch (error) {
            const response = (error as BadRequestException).getResponse() as { message: string[] };

            expect(response.message[0]).toContain('owner.email');
        }
    });

    it('rejects a property the schema does not declare', () => {
        const sut = new ZodValidationPipe(bodySchema);

        expect(() => sut.transform(payload({ rogue: true }))).toThrow(BadRequestException);
    });

    it('rejects a value that is not an object', () => {
        const sut = new ZodValidationPipe(bodySchema);

        expect(() => sut.transform(undefined)).toThrow(BadRequestException);
    });
});
