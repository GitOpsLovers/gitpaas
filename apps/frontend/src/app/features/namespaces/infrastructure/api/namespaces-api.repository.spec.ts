import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Namespace } from '@gitpaas/contracts';

import { NamespacesApiRepository } from './namespaces-api.repository';

import { environment } from '@environments/environment';

const BASE_URL = `${environment.apiBaseUrl}/namespaces`;

const namespace: Namespace = {
    id: 'ns-1',
    name: 'platform',
    description: 'The platform namespace',
    createdAt: '2026-03-14T00:00:00.000Z',
    projectsCount: 2,
};

/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}

describe('NamespacesApiRepository', () => {
    let repository: NamespacesApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                NamespacesApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(NamespacesApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('namespaces', () => {
        test('GETs the namespaces collection URL and exposes the response', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.namespaces());
            TestBed.tick();

            const req = httpMock.expectOne(BASE_URL);
            expect(req.request.method).toBe('GET');
            req.flush([namespace]);
            await settle();

            expect(resource.value()).toEqual([namespace]);
        });

        // eslint-disable-next-line vitest/expect-expect
        test('issues no request until the resource is created', () => {
            TestBed.tick();

            httpMock.expectNone(BASE_URL);
        });

        test('surfaces the failure on the resource when the request errors', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.namespaces());
            TestBed.tick();

            httpMock.expectOne(BASE_URL).flush('boom', { status: 500, statusText: 'Server Error' });
            await settle();

            expect(resource.status()).toBe('error');
            expect(resource.error()).toBeDefined();
        });
    });

    describe('namespaceById', () => {
        test('GETs the namespace URL for the current id and exposes the response', async () => {
            const resource = TestBed.runInInjectionContext(
                () => repository.namespaceById(() => namespace.id),
            );
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/${namespace.id}`);
            expect(req.request.method).toBe('GET');
            req.flush(namespace);
            await settle();

            expect(resource.value()).toEqual(namespace);
        });

        test('issues no request while the id is undefined and requests once it resolves', async () => {
            const id = signal<string | undefined>(undefined);
            const resource = TestBed.runInInjectionContext(() => repository.namespaceById(() => id()));
            TestBed.tick();

            httpMock.expectNone(`${BASE_URL}/undefined`);
            expect(resource.value()).toBeUndefined();

            id.set('ns-2');
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/ns-2`);
            expect(req.request.method).toBe('GET');
            req.flush({ ...namespace, id: 'ns-2' });
            await settle();

            expect(resource.value()).toEqual({ ...namespace, id: 'ns-2' });
        });
    });

    describe('create', () => {
        test('POSTs the dto to the collection URL and returns the created namespace', () => {
            let result: Namespace | undefined;

            repository.create({ name: 'platform' }).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(BASE_URL);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ name: 'platform' });
            req.flush(namespace);

            expect(result).toEqual(namespace);
        });
    });

    describe('update', () => {
        test('PUTs the dto to the namespace URL and returns the updated namespace', () => {
            let result: Namespace | undefined;

            repository.update('ns-1', { name: 'renamed' }).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/ns-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({ name: 'renamed' });
            req.flush({ ...namespace, name: 'renamed' });

            expect(result).toEqual({ ...namespace, name: 'renamed' });
        });
    });

    describe('delete', () => {
        test('DELETEs the namespace URL', () => {
            let completed = false;

            repository.delete('ns-1').subscribe(() => { completed = true; });

            const req = httpMock.expectOne(`${BASE_URL}/ns-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);

            expect(completed).toBe(true);
        });
    });
});
