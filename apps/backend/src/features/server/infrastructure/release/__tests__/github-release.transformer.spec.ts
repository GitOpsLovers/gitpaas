import { toLatestRelease } from '../github-release.transformer';

describe('toLatestRelease', () => {
    it('keeps the tag of the release, and drops its prefix for the version', () => {
        expect(toLatestRelease({ tag_name: 'v2.2.0' })).toEqual({ tag: 'v2.2.0', version: '2.2.0' });
    });

    it('keeps a tag that carries no prefix as the version', () => {
        expect(toLatestRelease({ tag_name: '2.2.0' })).toEqual({ tag: '2.2.0', version: '2.2.0' });
    });

    it('trims the tag GitHub answers', () => {
        expect(toLatestRelease({ tag_name: '  v2.2.0  ' })).toEqual({ tag: 'v2.2.0', version: '2.2.0' });
    });

    it('returns null when the body carries no tag', () => {
        expect(toLatestRelease({})).toBeNull();
    });

    it('returns null when the tag is empty', () => {
        expect(toLatestRelease({ tag_name: '   ' })).toBeNull();
    });

    it('returns null when the tag is no text', () => {
        expect(toLatestRelease({ tag_name: 42 })).toBeNull();
    });

    it('returns null when the body is absent', () => {
        expect(toLatestRelease(null)).toBeNull();
    });
});
