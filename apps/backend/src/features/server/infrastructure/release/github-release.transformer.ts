import type { LatestRelease } from '../../domain/models/platform-release.models';

/**
 * The single field of the answer of GitHub that the check of the update reads.
 */
interface GithubReleasePayload {
    tag_name?: unknown;
}

/**
 * Maps the answer of the GitHub API into the latest release of GitPaaS.x
 *
 * @param payload Body the GitHub API answered
 *
 * @returns The latest release, or `null` when the body carries no usable tag
 */
export function toLatestRelease(payload: unknown): LatestRelease | null {
    const tag = (payload as GithubReleasePayload | null)?.tag_name;

    if (typeof tag !== 'string' || tag.trim() === '') {
        return null;
    }

    const trimmed = tag.trim();

    return { tag: trimmed, version: trimmed.startsWith('v') ? trimmed.slice(1) : trimmed };
}
