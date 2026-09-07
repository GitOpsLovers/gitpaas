import { z } from 'zod';

/**
 * Where the Compose text of the answer comes from.
 */
export const finalComposeOriginSchema = z.enum(['deployment', 'repository', 'none']);

/**
 * The final Compose file of a service on the wire. GitPaaS masks the value of every variable of it.
 */
export const finalComposeSchema = z.object({
    text: z.string().nullable(),
    origin: finalComposeOriginSchema,
});

/**
 * The shape of the origin of the Compose text of an answer.
 */
export type FinalComposeOrigin = z.infer<typeof finalComposeOriginSchema>;

/**
 * The shape of the final Compose file that an answer of the API carries.
 */
export type FinalCompose = z.infer<typeof finalComposeSchema>;
