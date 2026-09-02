import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Namespace, Project, ProjectNetwork } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { PROJECT_NETWORK_IN_USE_MESSAGE, PROJECT_NETWORK_NAME_TAKEN_MESSAGE } from '../../../application/read-project-network-error.use-case';
import { NetworksApiRepository } from '../../../infrastructure/api/networks-api.repository';

import { ProjectNetworksListComponent } from './project-networks-list.component';

import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import type { BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ToastService } from '@shared/services/toast.service';

interface ProjectNetworksListInternals {
    saving: () => boolean;
    error: () => string | null;
    pendingRemoval: () => ProjectNetwork | null;
    removing: () => boolean;
    removeMessage: () => string;
    breadcrumb: () => BreadcrumbItem[];
    create: (name: string) => Promise<void>;
    rename: (change: { network: ProjectNetwork; name: string }) => Promise<void>;
    requestRemoval: (network: ProjectNetwork) => void;
    confirmRemoval: () => Promise<void>;
}

const NAMESPACE_ID = 'ns-1';

const PROJECT_ID = 'pr-1';

const namespace: Namespace = {
    id: NAMESPACE_ID, name: 'acme', description: '', createdAt: '2026-03-14T00:00:00.000Z', projectsCount: 1,
};

const project: Project = {
    id: PROJECT_ID,
    name: 'api',
    namespaceId: NAMESPACE_ID,
    servicesCount: 2,
    description: 'The API project',
    createdAt: '2026-01-01T00:00:00.000Z',
};

const network: ProjectNetwork = {
    id: 'nw-1',
    projectId: PROJECT_ID,
    name: 'backend',
    daemonName: 'gitpaas-pr-1-nw-1',
    state: 'ready',
};

const conflict = (code: string): unknown => ({
    status: 409,
    error: {
        statusCode: 409,
        code,
        message: 'Refused',
        error: 'Conflict',
        timestamp: '2026-08-29T00:00:00.000Z',
        path: `/projects/${PROJECT_ID}/networks`,
        requestId: 'req-1',
    },
});

describe('ProjectNetworksListComponent', () => {
    let fixture: ComponentFixture<ProjectNetworksListComponent>;
    let component: ProjectNetworksListInternals;
    let networksResource: { value: ReturnType<typeof signal<ProjectNetwork[] | undefined>>; reload: ReturnType<typeof vi.fn> };
    let repository: {
        networksByProject: ReturnType<typeof vi.fn>;
        createProjectNetwork: ReturnType<typeof vi.fn>;
        renameProjectNetwork: ReturnType<typeof vi.fn>;
        removeProjectNetwork: ReturnType<typeof vi.fn>;
    };
    let namespacesRepository: {
        namespaceById: ReturnType<typeof vi.fn>;
    };
    let projectsRepository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projectById: ReturnType<typeof vi.fn>;
    };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

    const create = (namespaceId = NAMESPACE_ID, projectId = PROJECT_ID): void => {
        fixture = TestBed.createComponent(ProjectNetworksListComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('projectId', projectId);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as ProjectNetworksListInternals;
    };

    beforeEach(() => {
        networksResource = { value: signal<ProjectNetwork[] | undefined>([network]), reload: vi.fn() };
        repository = {
            networksByProject: vi.fn().mockReturnValue(networksResource),
            createProjectNetwork: vi.fn().mockReturnValue(of(network)),
            renameProjectNetwork: vi.fn().mockReturnValue(of(network)),
            removeProjectNetwork: vi.fn().mockReturnValue(of(undefined)),
        };
        namespacesRepository = {
            namespaceById: vi.fn().mockReturnValue({ value: signal<Namespace | undefined>(namespace) }),
        };
        projectsRepository = {
            namespaceId: signal<string | undefined>(undefined),
            projectById: vi.fn().mockReturnValue({ value: signal<Project | undefined>(project) }),
        };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProjectNetworksListComponent],
            providers: [
                { provide: NamespacesApiRepository, useValue: namespacesRepository },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(ProjectNetworksListComponent, {
            set: {
                template: '',
                providers: [
                    { provide: NetworksApiRepository, useValue: repository },
                    { provide: ProjectsApiRepository, useValue: projectsRepository },
                ],
            },
        });
    });

    describe('the scope', () => {
        test('reads the networks of the project of the route', () => {
            create();

            const [accessor] = repository.networksByProject.mock.calls[0] as [() => string | undefined];

            expect(accessor()).toBe(PROJECT_ID);
        });

        test('writes the namespace of the route into the projects repository', () => {
            create();

            expect(projectsRepository.namespaceId()).toBe(NAMESPACE_ID);
        });

        test('reads the namespace of the route', () => {
            create();

            const [accessor] = namespacesRepository.namespaceById.mock.calls[0] as [() => string | undefined];

            expect(accessor()).toBe(NAMESPACE_ID);
        });

        test('names the namespace, the project and the networks in the breadcrumb', () => {
            create();

            expect(component.breadcrumb()).toEqual<BreadcrumbItem[]>([
                { label: 'acme', link: ['/namespaces', NAMESPACE_ID, 'projects'] },
                { label: 'api', link: ['/namespaces', NAMESPACE_ID, 'projects', PROJECT_ID] },
                { label: 'Networks' },
            ]);
        });

        test('rests with no write in flight and no error', () => {
            create();

            expect(component.saving()).toBe(false);
            expect(component.error()).toBeNull();
            expect(component.pendingRemoval()).toBeNull();
            expect(component.removing()).toBe(false);
        });
    });

    describe('create', () => {
        test('sends the name, reloads the list and announces the creation', async () => {
            create();

            await component.create('backend');

            expect(repository.createProjectNetwork).toHaveBeenCalledWith(PROJECT_ID, { name: 'backend' });
            expect(networksResource.reload).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalled();
            expect(component.saving()).toBe(false);
            expect(component.error()).toBeNull();
        });

        test('names the rule of the name when the project already holds it', async () => {
            create();
            repository.createProjectNetwork.mockReturnValue(
                throwError(() => conflict('PROJECT_NETWORK_NAME_TAKEN')),
            );

            await component.create('backend');

            expect(component.error()).toBe(PROJECT_NETWORK_NAME_TAKEN_MESSAGE);
            expect(networksResource.reload).not.toHaveBeenCalled();
            expect(toast.success).not.toHaveBeenCalled();
            expect(component.saving()).toBe(false);
        });
    });

    describe('rename', () => {
        test('sends the new name, reloads the list and announces the change', async () => {
            create();

            await component.rename({ network, name: 'core' });

            expect(repository.renameProjectNetwork).toHaveBeenCalledWith(PROJECT_ID, 'nw-1', { name: 'core' });
            expect(networksResource.reload).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalled();
        });

        test('names the rule of the name when the API refuses the change', async () => {
            create();
            repository.renameProjectNetwork.mockReturnValue(
                throwError(() => conflict('PROJECT_NETWORK_NAME_TAKEN')),
            );

            await component.rename({ network, name: 'core' });

            expect(component.error()).toBe(PROJECT_NETWORK_NAME_TAKEN_MESSAGE);
            expect(networksResource.reload).not.toHaveBeenCalled();
            expect(component.saving()).toBe(false);
        });
    });

    describe('the removal', () => {
        test('holds the network the user asks to remove, and names it in the message', () => {
            create();

            component.requestRemoval(network);

            expect(component.pendingRemoval()).toEqual(network);
            expect(component.removeMessage()).toContain('backend');
        });

        test('removes the network, reloads the list and announces the removal', async () => {
            create();

            component.requestRemoval(network);
            await component.confirmRemoval();

            expect(repository.removeProjectNetwork).toHaveBeenCalledWith(PROJECT_ID, 'nw-1');
            expect(networksResource.reload).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalled();
            expect(component.pendingRemoval()).toBeNull();
            expect(component.removing()).toBe(false);
        });

        test('names the container that still holds the network when the API answers 409', async () => {
            create();
            repository.removeProjectNetwork.mockReturnValue(
                throwError(() => conflict('PROJECT_NETWORK_IN_USE')),
            );

            component.requestRemoval(network);
            await component.confirmRemoval();

            expect(toast.error).toHaveBeenCalledWith('Could not remove the network', PROJECT_NETWORK_IN_USE_MESSAGE);
            expect(networksResource.reload).not.toHaveBeenCalled();
            expect(toast.success).not.toHaveBeenCalled();
            expect(component.removing()).toBe(false);
        });

        test('removes nothing when no network is pending', async () => {
            create();

            await component.confirmRemoval();

            expect(repository.removeProjectNetwork).not.toHaveBeenCalled();
        });
    });
});
