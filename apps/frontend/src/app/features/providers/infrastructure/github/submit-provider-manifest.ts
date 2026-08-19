import { ProviderAppManifest } from '../../domain/models/provider-registration.model';

/**
 * Hands the manifest to GitHub with a form the browser sends.
 *
 * @param document Document the form is written into
 * @param githubUrl Address of GitHub the form is sent to
 * @param manifest Manifest the platform wrote
 */
export function submitProviderManifest(document: Document, githubUrl: string, manifest: ProviderAppManifest): void {
    const form = document.createElement('form');

    form.method = 'post';
    form.action = githubUrl;

    const field = document.createElement('input');

    field.type = 'hidden';
    field.name = 'manifest';
    field.value = JSON.stringify(manifest);

    form.append(field);
    document.body.append(form);
    form.submit();
}
