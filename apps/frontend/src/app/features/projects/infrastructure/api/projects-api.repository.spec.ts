import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Project } from '@gitpaas/contracts';

import { ProjectsApiRepository } from './projects-api.repository';

import { environment } from '@environments/environment';

const NAMESPACE_ID = 'ns-1';

const BASE_URL = `${environment.apiBaseUrl}/namespaces/${NAMESPACE_ID}/projects`;

const project: Project = {
    id: 'pr-1',
    name: 'api',
    namespaceId: NAMESPACE_ID,
    servicesCount: 2,
    description: 'The API project',
    createdAt: '2026-01-01T00:00:00.000Z',
};

/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}

describe('ProjectsApiRepository', () => {
    let repository: ProjectsApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ProjectsApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(ProjectsApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        // The collection resource loads as soon as a namespace is set; drain it when
        // a test does not exercise it explicitly.
        httpMock.match(BASE_URL).forEach((req) => { req.flush([]); });
        httpMock.verify();
    });

    describe('projects resource', () => {
        // eslint-disable-next-line vitest/expect-expect
        test('issues no request until a namespace is set', () => {
            TestBed.tick();

            httpMock.expectNone(() => true);
        });

        test('GETs the namespace projects URL and exposes the response', async () => {
            repository.namespaceId.set(NAMESPACE_ID);
            TestBed.tick();

            const req = httpMock.expectOne(BASE_URL);
            expect(req.request.method).toBe('GET');
            req.flush([project]);
            await settle();

            expect(repository.projects.value()).toEqual([project]);
        });

        test('re-requests the collection under the new namespace when it changes', async () => {
            repository.namespaceId.set(NAMESPACE_ID);
            TestBed.tick();

            httpMock.expectOne(BASE_URL).flush([project]);
            await settle();

            repository.namespaceId.set('ns-2');
            TestBed.tick();

            const req = httpMock.expectOne(`${environment.apiBaseUrl}/namespaces/ns-2/projects`);
            expect(req.request.method).toBe('GET');
            req.flush([]);
            await settle();

            expect(repository.projects.value()).toEqual([]);
        });
    });

    describe('projectById', () => {
        test('GETs the project URL scoped by the current namespace', async () => {
            repository.namespaceId.set(NAMESPACE_ID);

            const resource = TestBed.runInInjectionContext(
                () => repository.projectById(() => project.id),
            );
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/${project.id}`);
            expect(req.request.method).toBe('GET');
            req.flush(project);
            await settle();

            expect(resource.value()).toEqual(project);

            // The collection resource also fires once the namespace is set.
            httpMock.expectOne(BASE_URL).flush([]);
        });

        test('re-requests the project under the new namespace when it changes', async () => {
            repository.namespaceId.set(NAMESPACE_ID);

            const resource = TestBed.runInInjectionContext(
                () => repository.projectById(() => project.id),
            );
            TestBed.tick();

            httpMock.expectOne(`${BASE_URL}/${project.id}`).flush(project);
            httpMock.expectOne(BASE_URL).flush([]);
            await settle();

            repository.namespaceId.set('ns-2');
            TestBed.tick();

            const req = httpMock.expectOne(`${environment.apiBaseUrl}/namespaces/ns-2/projects/${project.id}`);
            expect(req.request.method).toBe('GET');
            req.flush({ ...project, namespaceId: 'ns-2' });
            await settle();

            expect(resource.value()).toEqual({ ...project, namespaceId: 'ns-2' });

            httpMock.expectOne(`${environment.apiBaseUrl}/namespaces/ns-2/projects`).flush([]);
        });

        test('issues no request while the namespace or the id is undefined', () => {
            const id = signal<string | undefined>(undefined);
            const resource = TestBed.runInInjectionContext(() => repository.projectById(() => id()));
            TestBed.tick();

            httpMock.expectNone(() => true);
            expect(resource.value()).toBeUndefined();

            id.set(project.id);
            TestBed.tick();

            httpMock.expectNone(() => true);
        });
    });

    describe('create', () => {
        test('POSTs the dto to the projects URL of the given namespace', () => {
            let result: Project | undefined;

            repository.create(NAMESPACE_ID, { name: 'api' }).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(BASE_URL);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ name: 'api' });
            req.flush(project);

            expect(result).toEqual(project);
        });

        // eslint-disable-next-line vitest/expect-expect
        test('targets the given namespace, not the one currently selected', () => {
            repository.namespaceId.set('ns-other');
            TestBed.tick();
            httpMock.expectOne(`${environment.apiBaseUrl}/namespaces/ns-other/projects`).flush([]);

            repository.create(NAMESPACE_ID, { name: 'api' }).subscribe();

            httpMock.expectOne(BASE_URL).flush(project);
        });
    });

    describe('update', () => {
        test('PUTs the dto to the project URL of the given namespace', () => {
            let result: Project | undefined;

            repository.update(NAMESPACE_ID, 'pr-1', { name: 'renamed' }).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/pr-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({ name: 'renamed' });
            req.flush({ ...project, name: 'renamed' });

            expect(result).toEqual({ ...project, name: 'renamed' });
        });

        // eslint-disable-next-line vitest/expect-expect
        test('targets the given namespace, not the one currently selected', () => {
            repository.namespaceId.set('ns-other');
            TestBed.tick();
            httpMock.expectOne(`${environment.apiBaseUrl}/namespaces/ns-other/projects`).flush([]);

            repository.update(NAMESPACE_ID, 'pr-1', { name: 'renamed' }).subscribe();

            httpMock.expectOne(`${BASE_URL}/pr-1`).flush(project);
        });
    });

    describe('delete', () => {
        test('DELETEs the project URL of the current namespace', () => {
            let completed = false;

            repository.namespaceId.set(NAMESPACE_ID);
            repository.delete('pr-1').subscribe(() => { completed = true; });

            const req = httpMock.expectOne(`${BASE_URL}/pr-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);

            expect(completed).toBe(true);
        });

        test('falls back to an empty namespace segment when no namespace is selected', () => {
            repository.delete('pr-1').subscribe();

            const req = httpMock.expectOne(`${environment.apiBaseUrl}/namespaces//projects/pr-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });
    });
});
