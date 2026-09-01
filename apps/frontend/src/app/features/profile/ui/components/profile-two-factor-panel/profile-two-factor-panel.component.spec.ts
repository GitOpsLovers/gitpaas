/* eslint-disable no-secrets/no-secrets */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TotpSetup } from '@gitpaas/contracts';

import { ProfileTwoFactorPanelComponent } from './profile-two-factor-panel.component';

interface ProfileTwoFactorPanelInternals {
    code: () => string;
    codeValid: () => boolean;
    onCodeChange: (value: string | number) => void;
    onSubmit: (event: Event) => void;
}

const setup: TotpSetup = {
    secret: 'JBSWY3DPEHPK3PXP',
    otpauthUri: 'otpauth://totp/GitPaaS:ada@gitpaas.dev?secret=JBSWY3DPEHPK3PXP',
    qrCode: 'data:image/png;base64,AAAA',
};

describe('ProfileTwoFactorPanelComponent', () => {
    let fixture: ComponentFixture<ProfileTwoFactorPanelComponent>;
    let component: ProfileTwoFactorPanelInternals;
    let started: number;
    let enabled: string[];
    let cancelled: number;
    let disabled: number;

    const create = (
        isEnabled = false,
        pending: TotpSetup | null = null,
        busy = false,
        error: string | null = null,
    ): void => {
        fixture = TestBed.createComponent(ProfileTwoFactorPanelComponent);
        fixture.componentRef.setInput('enabled', isEnabled);
        fixture.componentRef.setInput('setup', pending);
        fixture.componentRef.setInput('busy', busy);
        fixture.componentRef.setInput('error', error);
        component = fixture.componentInstance as unknown as ProfileTwoFactorPanelInternals;
        started = 0;
        enabled = [];
        cancelled = 0;
        disabled = 0;
        fixture.componentInstance.begin.subscribe(() => { started += 1; });
        fixture.componentInstance.enable.subscribe((code) => enabled.push(code));
        fixture.componentInstance.discard.subscribe(() => { cancelled += 1; });
        fixture.componentInstance.disable.subscribe(() => { disabled += 1; });
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const button = (name: string): HTMLButtonElement =>
        fixture.nativeElement.querySelector(`app-button[name="${name}"] button`) as HTMLButtonElement;

    const image = (): HTMLImageElement | null => fixture.nativeElement.querySelector('img');

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ProfileTwoFactorPanelComponent] });
    });

    describe('while the second factor is off and no setup runs', () => {
        test('offers the setup, and shows neither the image of the QR nor the field of the code', () => {
            create();

            expect(text()).toContain('The second factor is off.');
            expect(image()).toBeNull();
            expect(fixture.nativeElement.querySelector('input[name="two-factor-code"]')).toBeNull();
        });

        test('asks the container for a fresh secret', () => {
            create();

            button('two-factor-start').click();

            expect(started).toBe(1);
        });
    });

    describe('while a setup runs', () => {
        test('shows the image of the QR and the key in text', () => {
            create(false, setup);

            expect(image()?.getAttribute('src')).toBe(setup.qrCode);
            expect(text()).toContain(setup.secret);
        });

        test('emits the code of six digits', () => {
            create(false, setup);

            component.onCodeChange('123456');
            component.onSubmit(new Event('submit'));

            expect(enabled).toEqual(['123456']);
        });

        test('stops the native submit of the form', () => {
            create(false, setup);

            component.onCodeChange('123456');

            const event = new Event('submit');
            const preventDefault = vi.spyOn(event, 'preventDefault');

            component.onSubmit(event);

            expect(preventDefault).toHaveBeenCalledTimes(1);
        });

        test.each(['12345', '1234567', '12a456', ''])('emits nothing for the code %o', (code) => {
            create(false, setup);

            component.onCodeChange(code);
            fixture.detectChanges();

            expect(component.codeValid()).toBe(false);

            component.onSubmit(new Event('submit'));

            expect(enabled).toEqual([]);
        });

        test('empties the field when a new secret arrives', () => {
            create(false, setup);

            component.onCodeChange('123456');

            fixture.componentRef.setInput('setup', { ...setup, secret: 'OTHER' });
            fixture.detectChanges();

            expect(component.code()).toBe('');
        });

        test('asks the container to drop the setup', () => {
            create(false, setup);

            button('two-factor-cancel').click();

            expect(cancelled).toBe(1);
        });

        test('emits nothing while a request is in flight', () => {
            create(false, setup, true);

            component.onCodeChange('123456');
            component.onSubmit(new Event('submit'));

            expect(enabled).toEqual([]);
        });
    });

    describe('while the second factor is on', () => {
        test('states that it guards the sign-in, and shows no image of the QR', () => {
            create(true);

            expect(text()).toContain('The second factor is on.');
            expect(image()).toBeNull();
        });

        test('asks the container to turn the second factor off', () => {
            create(true);

            button('two-factor-disable').click();

            expect(disabled).toBe(1);
        });

        test('asks nothing while a request is in flight', () => {
            create(true, null, true);

            button('two-factor-disable').click();

            expect(disabled).toBe(0);
        });
    });

    test('shows the sentence of the failure that the container gives', () => {
        create(false, null, false, 'That code is wrong.');

        expect(text()).toContain('That code is wrong.');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });
});
