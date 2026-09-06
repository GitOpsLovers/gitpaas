/**
 * One reference of a variable in a compose recipe.
 */
// eslint-disable-next-line security/detect-unsafe-regex, optimize-regex/optimize-regex
const VARIABLE_REFERENCE = /\$(?:(\$)|\{([A-Za-z_][A-Za-z0-9_]*)(?:(:?-)([^}]*))?\}|([A-Za-z_][A-Za-z0-9_]*))/g;

/**
 * Substitutes every reference of a variable held by one text of the recipe.
 *
 * @param text Text of the recipe, as the user wrote it
 * @param variables Variables of the service, by their name
 *
 * @returns The text with every reference substituted, and every `$$` turned into one `$`
 */
function interpolateText(text: string, variables: Map<string, string>): string {
    return text.replace(
        VARIABLE_REFERENCE,
        (_match: string, escape?: string, braced?: string, separator?: string, fallback?: string, bare?: string): string => {
            if (escape !== undefined) {
                return '$';
            }

            const value = variables.get(braced ?? bare ?? '');

            // `:-` falls back on an unset and on an empty value, and `-` falls back on an unset value alone.
            if (separator === ':-') {
                return value === undefined || value === '' ? interpolateText(fallback ?? '', variables) : value;
            }

            if (separator === '-') {
                return value === undefined ? interpolateText(fallback ?? '', variables) : value;
            }

            // A variable the service does not hold gives an empty text, and never stops the deployment.
            return value ?? '';
        },
    );
}

/**
 * Substitutes every reference of a variable held by one node of the recipe, at every depth.
 *
 * @param node Key, value, item of a list or map of the recipe
 * @param variables Variables of the service, by their name
 *
 * @returns A new node with every text of it interpolated
 */
function interpolateNode(node: unknown, variables: Map<string, string>): unknown {
    if (typeof node === 'string') {
        return interpolateText(node, variables);
    }

    if (Array.isArray(node)) {
        return node.map((item) => interpolateNode(item, variables));
    }

    if (node !== null && typeof node === 'object') {
        return Object.fromEntries(Object.entries(node).map(([key, value]) => [
            interpolateText(key, variables),
            interpolateNode(value, variables),
        ]));
    }

    return node;
}

/**
 * Substitutes every reference of a variable of a parsed compose recipe with the value the service holds.
 *
 * @param recipe Parsed compose recipe, as the user wrote it
 * @param variables Variables of the section "Environments" of the service, by their name
 *
 * @returns A new recipe, interpolated, leaving the given one untouched
 */
export function interpolateRecipe<TRecipe>(recipe: TRecipe, variables: Record<string, string>): TRecipe {
    return interpolateNode(recipe, new Map(Object.entries(variables))) as TRecipe;
}
