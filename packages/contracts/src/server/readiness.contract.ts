import { z } from 'zod';

/**
 * Whether one critical dependency of the server is reachable.
 */
export const dependencyStateSchema = z.enum(['up', 'down']);

/**
 * The reachability of one critical dependency, as a readiness check probes it.
 */
export const dependencyStatusSchema = z.object({
    name: z.string(),
    status: dependencyStateSchema,
});

/**
 * The aggregate readiness of the server: `ok` only when every dependency is `up`.
 */
export const readinessStateSchema = z.enum(['ok', 'error']);

/**
 * The answer of a readiness check: the overall status and the breakdown per dependency.
 */
export const readinessResultSchema = z.object({
    status: readinessStateSchema,
    dependencies: z.array(dependencyStatusSchema),
});

/**
 * The state of one dependency, as an answer of the API carries it.
 */
export type DependencyState = z.infer<typeof dependencyStateSchema>;

/**
 * The shape of the reachability of one dependency that an answer of the API carries.
 */
export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;

/**
 * The aggregate readiness, as an answer of the API carries it.
 */
export type ReadinessState = z.infer<typeof readinessStateSchema>;

/**
 * The shape of the answer of a readiness check.
 */
export type ReadinessResult = z.infer<typeof readinessResultSchema>;
