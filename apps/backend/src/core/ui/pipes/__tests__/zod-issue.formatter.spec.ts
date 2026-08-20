import type { core } from 'zod';

import { formatZodIssue } from '../zod-issue.formatter';

/** Builds an issue of Zod fixture, overriding only the fields under test. */
const issue = (overrides: Partial<core.$ZodIssue> = {}): core.$ZodIssue =>
    ({
        code: 'invalid_type',
        expected: 'string',
        input: 42,
        path: ['name'],
        message: 'Invalid input: expected string, received number',
        ...overrides,
    }) as core.$ZodIssue;

describe('formatZodIssue', () => {
    it('prefixes the message with the path of the property', () => {
        const result = formatZodIssue(issue());

        expect(result).toBe('name: Invalid input: expected string, received number');
    });

    it('joins a nested path with a dot', () => {
        const result = formatZodIssue(issue({ path: ['owner', 'email'] }));

        expect(result).toBe('owner.email: Invalid input: expected string, received number');
    });

    it('writes the index of an element of an array as a segment of the path', () => {
        const result = formatZodIssue(issue({ path: ['services', 0, 'name'] }));

        expect(result).toBe('services.0.name: Invalid input: expected string, received number');
    });

    it('returns the bare message when the issue belongs to the root value', () => {
        const result = formatZodIssue(issue({ path: [] }));

        expect(result).toBe('Invalid input: expected string, received number');
    });
});
