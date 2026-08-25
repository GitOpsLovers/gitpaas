import { z } from 'zod';

/**
 * The greatest count of the characters of a host.
 */
export const DOMAIN_HOST_MAX_LENGTH = 253;

/**
 * The rule a host follows: labels of letters, of numbers and of the hyphen, joined by a point.
 */
// eslint-disable-next-line security/detect-unsafe-regex
export const DOMAIN_HOST_PATTERN = /^[\da-z]([\da-z-]*[\da-z])?(\.[\da-z]([\da-z-]*[\da-z])?)+$/;

/**
 * The message the API gives when a host breaks the rule.
 */
export const DOMAIN_HOST_MESSAGE = 'The host holds letters, numbers, the hyphen and the point, it carries at least two labels, and no label starts or ends with the hyphen';

/**
 * The smallest port a domain can target.
 */
export const DOMAIN_PORT_MIN = 1;

/**
 * The greatest port a domain can target.
 */
export const DOMAIN_PORT_MAX = 65_535;

/**
 * The host of a domain, as a body of the API carries it. It reaches the write in small letters.
 */
export const domainHost = z
    .string()
    .trim()
    .toLowerCase()
    .max(DOMAIN_HOST_MAX_LENGTH)
    .regex(DOMAIN_HOST_PATTERN, DOMAIN_HOST_MESSAGE);

/**
 * The name of the compose service a domain sends its traffic to.
 */
export const domainTargetService = z.string().trim().min(1);

/**
 * The port of the compose service a domain sends its traffic to.
 */
export const domainPort = z.int().min(DOMAIN_PORT_MIN).max(DOMAIN_PORT_MAX);

/**
 * Where the certificate of a domain stands: `none` when the domain answers on HTTP alone.
 */
export const certificateStateSchema = z.enum(['none', 'pending', 'ready', 'failed']);

/**
 * A domain on the wire. It is one public host that reaches one compose service of one service.
 */
export const domainSchema = z.object({
    id: z.uuid(),
    serviceId: z.uuid(),
    host: z.string(),
    targetService: z.string(),
    port: z.int(),
    https: z.boolean(),
    certificateState: certificateStateSchema,
    certificateError: z.string().nullable(),
});

/**
 * The body that claims a domain for a service.
 */
export const claimDomainSchema = z.strictObject({
    host: domainHost,
    targetService: domainTargetService,
    port: domainPort,
    https: z.boolean(),
});

/**
 * The body that changes a domain that a service already holds.
 */
export const updateDomainSchema = z.strictObject({
    host: domainHost.optional(),
    targetService: domainTargetService.optional(),
    port: domainPort.optional(),
    https: z.boolean().optional(),
});

/**
 * The state of the certificate of a domain.
 */
export type CertificateState = z.infer<typeof certificateStateSchema>;

/**
 * The shape of a domain that an answer of the API carries.
 */
export type Domain = z.infer<typeof domainSchema>;

/**
 * The shape of the body that claims a domain.
 */
export type ClaimDomainDto = z.infer<typeof claimDomainSchema>;

/**
 * The shape of the body that changes a domain.
 */
export type UpdateDomainDto = z.infer<typeof updateDomainSchema>;
