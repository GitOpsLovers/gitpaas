import { z } from 'zod';

/**
 * The lifecycle status of a deployment.
 */
export const deploymentStatusSchema = z.enum(['pending', 'running', 'success', 'failed']);

/**
 * A deployment on the wire. It is one attempt to bring the compose stack of a service up on the server.
 */
export const deploymentSchema = z.object({
    id: z.uuid(),
    serviceId: z.uuid(),
    status: deploymentStatusSchema,
    branch: z.string(),
    commit: z.string().nullable(),
    commitMessage: z.string().nullable(),
    composerPath: z.string(),
    triggeredBy: z.string(),
    error: z.string().nullable(),
    createdAt: z.iso.datetime(),
    finishedAt: z.iso.datetime().nullable(),
});

/**
 * The body that triggers a deployment of a service.
 */
export const triggerDeploymentSchema = z.strictObject({
    serviceId: z.uuid(),
});

/**
 * The lifecycle status of a deployment, as an answer of the API carries it.
 */
export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>;

/**
 * The shape of a deployment that an answer of the API carries.
 */
export type Deployment = z.infer<typeof deploymentSchema>;

/**
 * The shape of the body that triggers a deployment.
 */
export type TriggerDeploymentDto = z.infer<typeof triggerDeploymentSchema>;
