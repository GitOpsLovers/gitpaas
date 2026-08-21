import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { GitBranch, GitRepository, Provider } from '@gitpaas/contracts';

import { ServiceProviderComponent, ServiceProviderSettings } from './service-provider.component';

import { ProvidersApiRepository } from '@features/providers/infrastructure/api/providers-api.repository';
import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

interface ServiceProviderInternals {
    onSubmit: (event: Event) => void;
    onProviderChange: (value: string) => void;
    onRepositoryChange: (value: string) => void;
    onComposerPathChange: (value: string | number) => void;
}

interface ResourceStub<T> {
    value: WritableSignal<T | undefined>;
    isLoading: WritableSignal<boolean>;
    error: WritableSignal<unknown>;
}

const providers: Provider[] = [
    {
        id: 'pv-1',
        name: 'acme-github',
        type: 'github_app',
        appId: '123456',
        installationId: '9876',
        keyFingerprint: 'a1b2c3d4',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
    },
    {
        id: 'pv-2',
        name: 'other-github',
        type: 'github_app',
        appId: '654321',
        installationId: '6789',
        keyFingerprint: 'd4c3b2a1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
    },
];

const repositories: GitRepository[] = [
    {
        id: 11, fullName: 'acme/api', defaultBranch: 'main', private: true,
    },
    {
        id: 22, fullName: 'acme/web', defaultBranch: 'main', private: false,
    },
];

const branches: GitBranch[] = [
    { name: 'main' },
    { name: 'develop' },
];

const initial: ServiceProviderSettings = {
    providerId: '',
    repositoryId: '',
    deploymentBranch: '',
    composerPath: 'docker-compose.yml',
};

const stub = <T>(value?: T): ResourceStub<T> => ({
    value: signal<T | undefined>(value),
    isLoading: signal(false),
    error: signal<unknown>(undefined),
});

const asResource = <T>(source: ResourceStub<T>) => ({
    value: () => source.value(),
    isLoading: () => source.isLoading(),
    error: () => source.error(),
    hasValue: () => source.value() !== undefined,
});

describe('ServiceProviderComponent', () => {
    let providersResource: ResourceStub<Provider[]>;
    let repositoriesResource: ResourceStub<GitRepository[]>;
    let branchesResource: ResourceStub<GitBranch[]>;
    let repositoriesProviderId: () => string | undefined;
    let branchesProviderId: () => string | undefined;
    let branchesRepositoryId: () => number | undefined;
    let repository: {
        providers: ReturnType<typeof asResource<Provider[]>>;
        repositoriesByProvider: ReturnType<typeof vi.fn>;
        branchesByRepository: ReturnType<typeof vi.fn>;
    };
    let fixture: ComponentFixture<ServiceProviderComponent>;
    let component: ServiceProviderInternals;
    let saved: ServiceProviderSettings[];

    const create = (settings: ServiceProviderSettings = initial, saving = false): void => {
        fixture = TestBed.createComponent(ServiceProviderComponent);
        fixture.componentRef.setInput('initial', settings);
        fixture.componentRef.setInput('saving', saving);
        component = fixture.componentInstance as unknown as ServiceProviderInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((value) => saved.push(value));
        fixture.detectChanges();
    };

    const selects = (): Select2Component[] =>
        fixture.debugElement.queryAll(By.directive(Select2Component)).map((item) => item.componentInstance as Select2Component);

    const optionsOf = (select: Select2Component): Select2Option[] => select.options();

    const text = (): string => fixture.nativeElement.textContent as string;

    beforeEach(() => {
        providersResource = stub<Provider[]>(providers);
        repositoriesResource = stub<GitRepository[]>(repositories);
        branchesResource = stub<GitBranch[]>(branches);

        repository = {
            providers: asResource(providersResource),
            repositoriesByProvider: vi.fn((accessor: () => string | undefined) => {
                repositoriesProviderId = accessor;

                return asResource(repositoriesResource);
            }),
            branchesByRepository: vi.fn((provider: () => string | undefined, id: () => number | undefined) => {
                branchesProviderId = provider;
                branchesRepositoryId = id;

                return asResource(branchesResource);
            }),
        };

        TestBed.configureTestingModule({
            imports: [ServiceProviderComponent],
            providers: [provideRouter([])],
        });

        TestBed.overrideComponent(ServiceProviderComponent, {
            set: { providers: [{ provide: ProvidersApiRepository, useValue: repository }] },
        });
    });

    describe('the three selects of the chain', () => {
        test('shows the provider, the repository and the branch as the first three controls', () => {
            create();

            const [provider, repositorySelect, branch] = selects();

            expect(selects()).toHaveLength(3);
            expect(optionsOf(provider)).toEqual([
                { value: 'pv-1', label: 'acme-github' },
                { value: 'pv-2', label: 'other-github' },
            ]);
            expect(optionsOf(repositorySelect)).toEqual([
                { value: '11', label: 'acme/api' },
                { value: '22', label: 'acme/web' },
            ]);
            expect(optionsOf(branch)).toEqual([
                { value: 'main', label: 'main' },
                { value: 'develop', label: 'develop' },
            ]);
        });

        test('seeds the four controls from the initial settings', () => {
            create({
                providerId: 'pv-1', repositoryId: '11', deploymentBranch: 'main', composerPath: 'stack/compose.yml',
            });

            const [provider, repositorySelect, branch] = selects();

            expect(provider.value()).toBe('pv-1');
            expect(repositorySelect.value()).toBe('11');
            expect(branch.value()).toBe('main');
            const path = fixture.nativeElement.querySelector('app-input-field input') as HTMLInputElement;

            expect(path.value).toBe('stack/compose.yml');
        });

        test('keeps the repository blocked until the user chooses a provider', () => {
            create();

            expect(selects()[1].disabled()).toBe(true);

            component.onProviderChange('pv-1');
            fixture.detectChanges();

            expect(selects()[1].disabled()).toBe(false);
        });

        test('keeps the branch blocked until the user chooses a repository', () => {
            create({ ...initial, providerId: 'pv-1' });

            expect(selects()[2].disabled()).toBe(true);

            component.onRepositoryChange('11');
            fixture.detectChanges();

            expect(selects()[2].disabled()).toBe(false);
        });

        test('blocks each control while its own list is being read', () => {
            create({
                providerId: 'pv-1', repositoryId: '11', deploymentBranch: 'main', composerPath: '',
            });

            providersResource.isLoading.set(true);
            repositoriesResource.isLoading.set(true);
            branchesResource.isLoading.set(true);
            fixture.detectChanges();

            const [provider, repositorySelect, branch] = selects();

            expect(provider.disabled()).toBe(true);
            expect(repositorySelect.disabled()).toBe(true);
            expect(branch.disabled()).toBe(true);
            expect(provider.placeholder()).toBe('Loading providers…');
            expect(repositorySelect.placeholder()).toBe('Loading repositories…');
            expect(branch.placeholder()).toBe('Loading branches…');
        });

        test('asks the repository resource for no provider while none is chosen', () => {
            create();

            expect(repository.repositoriesByProvider).toHaveBeenCalledTimes(1);
            expect(repositoriesProviderId()).toBeUndefined();
            expect(branchesProviderId()).toBeUndefined();
            expect(branchesRepositoryId()).toBeUndefined();
        });
    });

    describe('Scenario: The user chooses a provider', () => {
        test('reads the repositories of that provider, opens the repository and clears the repository and the branch', () => {
            create({
                providerId: 'pv-1', repositoryId: '11', deploymentBranch: 'main', composerPath: 'docker-compose.yml',
            });

            component.onProviderChange('pv-2');
            fixture.detectChanges();

            const [provider, repositorySelect, branch] = selects();

            expect(repositoriesProviderId()).toBe('pv-2');
            expect(provider.value()).toBe('pv-2');
            expect(repositorySelect.disabled()).toBe(false);
            expect(repositorySelect.value()).toBe('');
            expect(branch.value()).toBe('');
            expect(branch.disabled()).toBe(true);
            expect(branchesRepositoryId()).toBeUndefined();
        });

        test('stops reading the repositories when the provider is cleared', () => {
            create({
                providerId: 'pv-1', repositoryId: '11', deploymentBranch: 'main', composerPath: '',
            });

            component.onProviderChange('');
            fixture.detectChanges();

            expect(repositoriesProviderId()).toBeUndefined();
            expect(selects()[1].disabled()).toBe(true);
        });
    });

    describe('Scenario: The user chooses a repository', () => {
        test('reads the branches of that repository and clears the branch', () => {
            create({
                providerId: 'pv-1', repositoryId: '11', deploymentBranch: 'main', composerPath: '',
            });

            component.onRepositoryChange('22');
            fixture.detectChanges();

            const [, repositorySelect, branch] = selects();

            expect(branchesProviderId()).toBe('pv-1');
            expect(branchesRepositoryId()).toBe(22);
            expect(repositorySelect.value()).toBe('22');
            expect(branch.value()).toBe('');
            expect(branch.disabled()).toBe(false);
        });

        test('keeps the provider untouched when the repository changes', () => {
            create({
                providerId: 'pv-1', repositoryId: '11', deploymentBranch: 'main', composerPath: '',
            });

            component.onRepositoryChange('22');
            fixture.detectChanges();

            expect(selects()[0].value()).toBe('pv-1');
            expect(repositoriesProviderId()).toBe('pv-1');
        });
    });

    describe('Scenario: No provider exists', () => {
        test('shows the empty state with a link to /providers/add, and it shows no form', () => {
            providersResource.value.set([]);
            create();

            expect(text()).toContain('No providers yet.');
            expect(fixture.nativeElement.querySelector('form')).toBeNull();
            expect(selects()).toHaveLength(0);

            const link = fixture.nativeElement.querySelector('a[href="/providers/add"]') as HTMLAnchorElement;

            expect(link).not.toBeNull();
            expect(link.textContent?.trim()).toBe('Register your first provider');
        });

        test('shows the form while the list of the providers has not arrived', () => {
            providersResource.value.set(undefined);
            providersResource.isLoading.set(true);
            create();

            expect(text()).not.toContain('No providers yet.');
            expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
        });

        test('shows the form when at least one provider exists', () => {
            create();

            expect(text()).not.toContain('No providers yet.');
            expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
        });
    });

    describe('the submit', () => {
        test('emits the provider first, together with the repository, the branch and the trimmed path', () => {
            create({
                providerId: 'pv-1', repositoryId: '11', deploymentBranch: 'main', composerPath: '',
            });

            component.onComposerPathChange('  stack/compose.yml  ');

            const event = new Event('submit');
            const preventDefault = vi.spyOn(event, 'preventDefault');

            component.onSubmit(event);

            expect(preventDefault).toHaveBeenCalledTimes(1);
            expect(saved).toEqual([{
                providerId: 'pv-1',
                repositoryId: '11',
                deploymentBranch: 'main',
                composerPath: 'stack/compose.yml',
            }]);
            expect(Object.keys(saved[0])[0]).toBe('providerId');
        });

        test('emits the cleared repository and branch after the provider changed', () => {
            create({
                providerId: 'pv-1', repositoryId: '11', deploymentBranch: 'main', composerPath: 'docker-compose.yml',
            });

            component.onProviderChange('pv-2');
            component.onSubmit(new Event('submit'));

            expect(saved).toEqual([{
                providerId: 'pv-2',
                repositoryId: '',
                deploymentBranch: '',
                composerPath: 'docker-compose.yml',
            }]);
        });

        test('announces the saving on the button and blocks it', () => {
            create(initial, true);

            const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

            expect(button.textContent?.trim()).toBe('Saving…');
            expect(button.disabled).toBe(true);
        });
    });

    describe('the failures of the reading', () => {
        test('reports a failed reading of the providers', () => {
            providersResource.error.set(new Error('boom'));
            create();

            expect(text()).toContain('Could not load providers. Is the backend running?');
        });

        test('reports a failed reading of the repositories', () => {
            repositoriesResource.error.set(new Error('boom'));
            create({ ...initial, providerId: 'pv-1' });

            expect(text()).toContain('Could not load repositories. Check the credentials of the provider.');
        });
    });
});
