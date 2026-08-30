import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PlatformSettings } from '@gitpaas/contracts';
import { NEVER, of, throwError } from 'rxjs';

import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';

import { ServerSettingsComponent } from './server-settings.component';

import { ToastService } from '@shared/services/toast.service';

interface ServerSettingsInternals {
    logRetentionDays: () => number | undefined;
    boundsError: () => string | null;
    saving: () => boolean;
    onLogRetentionDaysChange: (value: string | number) => void;
    save: (event: Event) => Promise<void>;
}

const settings: PlatformSettings = { logRetentionDays: 30 };

const submitEvent = (): Event => new Event('submit', { cancelable: true });

describe('ServerSettingsComponent', () => {
    let value: ReturnType<typeof signal<PlatformSettings | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let error: ReturnType<typeof signal<unknown>>;
    let repository: {
        settings: ReturnType<typeof vi.fn>;
        updateSettings: ReturnType<typeof vi.fn>;
    };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ServerSettingsComponent>;
    let component: ServerSettingsInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(ServerSettingsComponent);
        component = fixture.componentInstance as unknown as ServerSettingsInternals;
        fixture.detectChanges();
    };

    beforeEach(() => {
        value = signal<PlatformSettings | undefined>(undefined);
        isLoading = signal(false);
        error = signal<unknown>(undefined);
        repository = {
            settings: vi.fn().mockReturnValue({ value, isLoading, error }),
            updateSettings: vi.fn(),
        };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ServerSettingsComponent],
            providers: [{ provide: ToastService, useValue: toast }],
        });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ServerSettingsComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ServerApiRepository, useValue: repository }],
                },
            });
        });

        test('reads the settings when the tab opens', () => {
            create();

            expect(repository.settings).toHaveBeenCalledTimes(1);
        });

        test('fills the field once the settings arrive', () => {
            create();

            expect(component.logRetentionDays()).toBeUndefined();

            value.set(settings);

            expect(component.logRetentionDays()).toBe(30);
        });

        test('writes the age that the field holds', async () => {
            repository.updateSettings.mockReturnValue(of({ logRetentionDays: 45 }));
            create();
            value.set(settings);

            component.onLogRetentionDaysChange(45);
            await component.save(submitEvent());

            expect(repository.updateSettings).toHaveBeenCalledWith({ logRetentionDays: 45 });
            expect(value()).toEqual({ logRetentionDays: 45 });
            expect(toast.success).toHaveBeenCalledWith('Settings saved', expect.stringContaining('45'));
        });

        test('names the failure of the save and re-enables the form', async () => {
            repository.updateSettings.mockReturnValue(throwError(() => new Error('boom')));
            create();
            value.set(settings);

            await component.save(submitEvent());

            expect(toast.error).toHaveBeenCalledWith(
                'Could not save settings',
                'Something went wrong. Please try again.',
            );
            expect(toast.success).not.toHaveBeenCalled();
            expect(component.saving()).toBe(false);
        });

        test('marks the form as saving while the request is in flight', () => {
            repository.updateSettings.mockReturnValue(NEVER);
            create();
            value.set(settings);

            expect(component.saving()).toBe(false);

            component.save(submitEvent());

            expect(component.saving()).toBe(true);
        });

        test.each([0, 366, 1.5])('refuses to write the value %s, which falls outside the bounds', async (days) => {
            create();
            value.set(settings);

            component.onLogRetentionDaysChange(days);

            expect(component.boundsError()).toBe('Give a whole number of days between 1 and 365.');

            await component.save(submitEvent());

            expect(repository.updateSettings).not.toHaveBeenCalled();
        });

        test.each([1, 365])('accepts the value %s, which sits on a bound', (days) => {
            create();
            value.set(settings);

            component.onLogRetentionDaysChange(days);

            expect(component.boundsError()).toBeNull();
        });

        test('refuses to write an empty field', async () => {
            create();
            value.set(settings);

            component.onLogRetentionDaysChange('');

            expect(component.logRetentionDays()).toBeUndefined();

            await component.save(submitEvent());

            expect(repository.updateSettings).not.toHaveBeenCalled();
        });
    });

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ServerSettingsComponent, {
                set: {
                    providers: [{ provide: ServerApiRepository, useValue: repository }],
                },
            });
        });

        test('shows a skeleton of the field while the settings load', () => {
            isLoading.set(true);
            create();

            const skeletons = fixture.nativeElement.querySelectorAll('app-skeleton') as NodeListOf<HTMLElement>;

            expect(skeletons).toHaveLength(4);
            expect(fixture.nativeElement.textContent).not.toContain('Loading…');
            expect(fixture.nativeElement.querySelector('form')).toBeNull();
        });

        test('names the failure of the read', () => {
            error.set(new Error('boom'));
            create();

            expect(fixture.nativeElement.textContent).toContain('Could not load the settings.');
        });

        test('fills the field with the age that the API gives, and states the bounds next to it', () => {
            create();

            value.set(settings);
            fixture.detectChanges();

            const field = fixture.nativeElement.querySelector('input[name="log-retention-days"]') as HTMLInputElement;

            expect(field.value).toBe('30');
            expect(field.min).toBe('1');
            expect(field.max).toBe('365');
            expect(fixture.nativeElement.textContent).toContain('Between 1 and 365 days.');
        });

        test('writes the settings when the operator submits the form', () => {
            repository.updateSettings.mockReturnValue(NEVER);
            create();

            value.set(settings);
            fixture.detectChanges();

            (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(submitEvent());

            expect(repository.updateSettings).toHaveBeenCalledWith({ logRetentionDays: 30 });
        });
    });
});
