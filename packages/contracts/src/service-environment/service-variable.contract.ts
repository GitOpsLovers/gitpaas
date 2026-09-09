import { z } from 'zod';

/**
 * The rule a name of a variable follows.
 */
export const SERVICE_VARIABLE_NAME_PATTERN = /^[A-Z_][\dA-Z_]*$/;

/**
 * The message the API gives when a name breaks the rule.
 */
export const SERVICE_VARIABLE_NAME_MESSAGE = 'The name holds capital letters, numbers and the low line, and it does not start with a number';

/**
 * The greatest count of the characters of a name.
 */
export const SERVICE_VARIABLE_NAME_MAX_LENGTH = 255;

/**
 * The name of a variable, as a body of the API carries it.
 */
export const serviceVariableName = z
    .string()
    .max(SERVICE_VARIABLE_NAME_MAX_LENGTH)
    .regex(SERVICE_VARIABLE_NAME_PATTERN, SERVICE_VARIABLE_NAME_MESSAGE);

/**
 * A variable of a service on the wire.
 */
export const serviceVariableSchema = z.object({
    id: z.uuid(),
    serviceId: z.uuid(),
    name: z.string(),
    secret: z.boolean(),
    value: z.string().nullable(),
    valueSet: z.boolean(),
});

/**
 * Where a row of the list of the variables of a service comes from.
 */
export const serviceVariableOriginSchema = z.enum(['user', 'compose']);

/**
 * A row of the list of the variables of a service on the wire. Its `id` is `null` while the user never saved the row.
 */
export const serviceVariableRowSchema = serviceVariableSchema.extend({
    id: z.uuid().nullable(),
    origin: serviceVariableOriginSchema,
    composeRefreshedAt: z.iso.datetime().nullable(),
});

/**
 * The body that sets a variable of a service.
 */
export const setServiceVariableSchema = z.strictObject({
    name: serviceVariableName,
    value: z.string(),
    secret: z.boolean().optional(),
});

/**
 * The body that changes a variable of a service.
 */
export const updateServiceVariableSchema = z.strictObject({
    name: serviceVariableName.optional(),
    value: z.string().optional(),
});

/**
 * The shape of a variable that an answer of the API carries.
 */
export type ServiceVariable = z.infer<typeof serviceVariableSchema>;

/**
 * The shape of the origin of a row of the list of the variables of a service.
 */
export type ServiceVariableOrigin = z.infer<typeof serviceVariableOriginSchema>;

/**
 * The shape of a row of the list of the variables of a service that an answer of the API carries.
 */
export type ServiceVariableRow = z.infer<typeof serviceVariableRowSchema>;

/**
 * The shape of the body that sets a variable.
 */
export type SetServiceVariableDto = z.infer<typeof setServiceVariableSchema>;

/**
 * The shape of the body that changes a variable.
 */
export type UpdateServiceVariableDto = z.infer<typeof updateServiceVariableSchema>;
