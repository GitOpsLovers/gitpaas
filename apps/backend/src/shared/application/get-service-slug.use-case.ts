/**
 * Get slug of a service
 *
 * @param service Service to get the slug for
 *
 * @returns Service slug
 */
export function getServiceSlug(service: { id: string; name: string }): string {
    const slug = service.name.toLowerCase().replace(/[^\da-z]+/g, '-').replace(/^-+|-+$/g, '');

    return slug || `service-${service.id}`;
}
