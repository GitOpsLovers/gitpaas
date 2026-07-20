import { LocalAuthGuard } from '../local-auth.guard';

describe('LocalAuthGuard', () => {
    let sut: LocalAuthGuard;

    beforeEach(() => {
        jest.clearAllMocks();

        sut = new LocalAuthGuard();
    });

    it('is instantiable as a LocalAuthGuard', () => {
        expect(sut).toBeInstanceOf(LocalAuthGuard);
    });

    it('is a Passport AuthGuard exposing canActivate', () => {
        expect(typeof sut.canActivate).toBe('function');
    });

    it('inherits the Passport guard contract (handleRequest/logIn)', () => {
        expect(typeof sut.handleRequest).toBe('function');
        expect(typeof sut.logIn).toBe('function');
    });
});
