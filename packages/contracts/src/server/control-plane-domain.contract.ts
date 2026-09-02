import { z } from 'zod';

import { domainHost } from '../domains/domain.contract';

/**
 * Why the check of the domain of the control plane warns the operator.
 */
export const controlPlaneDomainWarningReasonSchema = z.enum([
    'mismatch',
    'host-address-unknown',
    'no-resolution',
    'cdn',
]);

/**
 * The advice the check of the domain of the control plane gives. It refuses nothing on its own.
 */
export const controlPlaneDomainWarningSchema = z.object({
    host: z.string(),
    resolvedAddresses: z.array(z.string()),
    hostAddress: z.string().nullable(),
    reason: controlPlaneDomainWarningReasonSchema,
    provider: z.string().nullable(),
    message: z.string(),
});

/**
 * The body of the check of a domain of the control plane the operator considers.
 */
export const checkControlPlaneDomainSchema = z.object({
    gitpaasDomain: domainHost,
});

/**
 * The answer of the check of a domain of the control plane: the advice, or nothing when it passes.
 */
export const controlPlaneDomainCheckResultSchema = z.object({
    warning: controlPlaneDomainWarningSchema.nullable(),
});

/**
 * The shape of the reason of a warning of the domain of the control plane.
 */
export type ControlPlaneDomainWarningReason = z.infer<typeof controlPlaneDomainWarningReasonSchema>;

/**
 * The shape of the advice the check of the domain of the control plane gives.
 */
export type ControlPlaneDomainWarning = z.infer<typeof controlPlaneDomainWarningSchema>;

/**
 * The shape of the body of the check of a domain of the control plane.
 */
export type CheckControlPlaneDomainDto = z.infer<typeof checkControlPlaneDomainSchema>;

/**
 * The shape of the answer of the check of a domain of the control plane.
 */
export type ControlPlaneDomainCheckResult = z.infer<typeof controlPlaneDomainCheckResultSchema>;
