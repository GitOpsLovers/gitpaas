import type { core } from 'zod';

/**
 * Turns one issue of Zod into the single line the client reads.
 *
 * @param issue Issue Zod raised while it parsed the payload
 *
 * @returns The message of the issue, prefixed with the path of the property it belongs to
 */
export function formatZodIssue(issue: core.$ZodIssue): string {
    const path = issue.path.map((segment) => String(segment)).join('.');

    return path ? `${path}: ${issue.message}` : issue.message;
}
