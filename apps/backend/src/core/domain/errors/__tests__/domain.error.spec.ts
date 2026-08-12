import { DomainError } from '../domain.error';

class SampleDomainError extends DomainError {
    constructor(options?: ErrorOptions) {
        super('SAMPLE_FAILURE', 'Sample failure', options);
    }
}

describe('DomainError', () => {
    it('is an Error', () => {
        expect(new SampleDomainError()).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new SampleDomainError()).toBeInstanceOf(DomainError);
    });

    it('carries the stable machine-readable code of the subclass', () => {
        expect(new SampleDomainError().code).toBe('SAMPLE_FAILURE');
    });

    it('keeps the message it received', () => {
        expect(new SampleDomainError().message).toBe('Sample failure');
    });

    it('names itself after the concrete subclass', () => {
        expect(new SampleDomainError().name).toBe('SampleDomainError');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('redis is down');

        expect(new SampleDomainError({ cause: original }).cause).toBe(original);
    });

    it('has no cause when none was given', () => {
        expect(new SampleDomainError().cause).toBeUndefined();
    });

    it('keeps a stack trace', () => {
        expect(new SampleDomainError().stack).toContain('SampleDomainError');
    });
});
