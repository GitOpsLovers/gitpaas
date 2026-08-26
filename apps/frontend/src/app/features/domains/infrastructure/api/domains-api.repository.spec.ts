import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ClaimDomainDto, Domain } from '@gitpaas/contracts';

import { DomainsApiRepository } from './domains-api.repository';

import { environment } from '@environments/environment';

const SERVICE_ID = 'sv-1';

const BASE_URL = `${environment.apiBaseUrl}/services/${SERVICE_ID}/domains`;

const domain: Domain = {
    id: 'dm-1',
    serviceId: SERVICE_ID,
    host: 'api.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'ready',
    certificateError: null,
};

/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}

describe('DomainsApiRepository', () => {
    let repository: DomainsApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DomainsApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(DomainsApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('domainsByService', () => {
        // eslint-disable-next-line vitest/expect-expect
        test('issues no request while the service identifier is absent', () => {
            const serviceId = signal<string | undefined>(undefined);

            TestBed.runInInjectionContext(() => repository.domainsByService(() => serviceId()));
            TestBed.tick();

            httpMock.expectNone(() => true);
        });

        test('GETs the domains of the service and exposes the answer', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.domainsByService(() => SERVICE_ID));
            TestBed.tick();

            const req = httpMock.expectOne(BASE_URL);
            expect(req.request.method).toBe('GET');
            req.flush([domain]);
            await settle();

            expect(resource.value()).toEqual([domain]);
        });

        test('reloads from the URL of the new service when the identifier changes', async () => {
            const serviceId = signal<string | undefined>(SERVICE_ID);

            TestBed.runInInjectionContext(() => repository.domainsByService(() => serviceId()));
            TestBed.tick();
            httpMock.expectOne(BASE_URL).flush([domain]);
            await settle();

            serviceId.set('sv-2');
            TestBed.tick();

            const req = httpMock.expectOne(`${environment.apiBaseUrl}/services/sv-2/domains`);
            expect(req.request.method).toBe('GET');
            req.flush([]);
            await settle();
        });
    });

    describe('claim', () => {
        test('POSTs the host, the compose service, the port and the choice of HTTPS', () => {
            const dto: ClaimDomainDto = {
                host: 'api.example.com', targetService: 'web', port: 8080, https: true,
            };
            let result: Domain | undefined;

            repository.claim(SERVICE_ID, dto).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(BASE_URL);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(dto);
            req.flush(domain);

            expect(result).toEqual(domain);
        });
    });

    describe('update', () => {
        test('PUTs the changed fields at the URL of the domain', () => {
            let result: Domain | undefined;

            repository.update(SERVICE_ID, 'dm-1', { port: 3000 }).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/dm-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({ port: 3000 });
            req.flush({ ...domain, port: 3000 });

            expect(result).toEqual({ ...domain, port: 3000 });
        });
    });

    describe('remove', () => {
        test('DELETEs the URL of the domain', () => {
            repository.remove(SERVICE_ID, 'dm-1').subscribe();

            const req = httpMock.expectOne(`${BASE_URL}/dm-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });
    });
});
