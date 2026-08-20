import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { output, ZodType } from 'zod';

import { formatZodIssue } from './zod-issue.formatter';

/**
 * Pipe that validates a bound parameter against a Zod schema.
 */
export class ZodValidationPipe<TSchema extends ZodType>
implements PipeTransform<unknown, output<TSchema>> {
    constructor(private readonly schema: TSchema) {}

    /**
     * Parses the incoming value with the schema of the binding.
     *
     * @param value Value Nest extracted from the request
     *
     * @returns The parsed value, with every conversion the schema declares
     *
     * @throws BadRequestException When the value does not satisfy the schema
     */
    public transform(value: unknown): output<TSchema> {
        const result = this.schema.safeParse(value);

        if (!result.success) {
            throw new BadRequestException(result.error.issues.map(formatZodIssue));
        }

        return result.data;
    }
}
