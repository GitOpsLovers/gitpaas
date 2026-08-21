import { z } from 'zod';

/**
 * The consistent JSON envelope that every failed request of the API carries.
 */
export const errorEnvelopeSchema = z.object({
    statusCode: z.int(),
    code: z.string(),
    message: z.union([z.string(), z.array(z.string())]),
    error: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    timestamp: z.iso.datetime(),
    path: z.string(),
    requestId: z.string(),
});

/**
 * The shape of the envelope that an answer of a failed request carries.
 */
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
