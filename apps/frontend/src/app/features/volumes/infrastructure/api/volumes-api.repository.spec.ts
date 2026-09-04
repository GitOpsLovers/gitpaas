import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Volume } from '@gitpaas/contracts';

import { VolumesApiRepository } from './volumes-api.repository';

import { environment } from '@environments/environment';

const SERVICE_ID = 'sv-1';

const VOLUME_ID = 'vl-1';

const VOLUMES_URL = `${environment.apiBaseUrl}/services/${SERVICE_ID}/volumes`;

const mountedVolume: Volume = {
    id: VOLUME_ID,
    name: 'uploads',
    daemonName: 'api-web_gitpaas-uploads',
    origin: 'gitpaas',
    state: 'mounted',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/api-web_gitpaas-uploads/_data',
    mount: { composeServiceName: 'web', containerPath: '/var/lib/app/uploads', readOnly: false },
    containers: ['api-web-1'],
};

const orphanVolume: Volume = {
    id: 'api-web_cache',
    name: 'cache',
    daemonName: 'api-web_cache',
    origin: 'compose',
    state: 'orphan',
    containers: [],
};

/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}

describe('VolumesApiRepository', () => {
    let repository: VolumesApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                VolumesApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(VolumesApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('volumesByService', () => {
        test('GETs the volumes URL of the service and exposes the response', async () => {
            const resource = TestBed.runInInjectionContext(
                () => repository.volumesByService(() => SERVICE_ID),
            );
            TestBed.tick();

            const req = httpMock.expectOne(VOLUMES_URL);
            expect(req.request.method).toBe('GET');
            req.flush([mountedVolume, orphanVolume]);
            await settle();

            expect(resource.value()).toEqual([mountedVolume, orphanVolume]);
        });

        test('re-requests the volumes under the new service when the identifier changes', async () => {
            const serviceId = signal(SERVICE_ID);
            const resource = TestBed.runInInjectionContext(
                () => repository.volumesByService(() => serviceId()),
            );
            TestBed.tick();

            httpMock.expectOne(VOLUMES_URL).flush([mountedVolume]);
            await settle();

            serviceId.set('sv-2');
            TestBed.tick();

            const req = httpMock.expectOne(`${environment.apiBaseUrl}/services/sv-2/volumes`);
            expect(req.request.method).toBe('GET');
            req.flush([orphanVolume]);
            await settle();

            expect(resource.value()).toEqual([orphanVolume]);
        });

        test('issues no request while the service identifier is undefined', () => {
            const serviceId = signal<string | undefined>(undefined);
            const resource = TestBed.runInInjectionContext(
                () => repository.volumesByService(() => serviceId()),
            );
            TestBed.tick();

            httpMock.expectNone(() => true);
            expect(resource.value()).toBeUndefined();
        });
    });

    describe('create', () => {
        test('POSTs the name and the mount to the volumes URL of the given service', () => {
            let result: Volume | undefined;

            repository.create(SERVICE_ID, {
                name: 'uploads', composeServiceName: 'web', containerPath: '/var/lib/app/uploads', readOnly: false,
            }).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(VOLUMES_URL);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({
                name: 'uploads', composeServiceName: 'web', containerPath: '/var/lib/app/uploads', readOnly: false,
            });
            req.flush(mountedVolume);

            expect(result).toEqual(mountedVolume);
        });
    });

    describe('rename', () => {
        test('PUTs the name to the URL of that volume', () => {
            let result: Volume | undefined;

            repository.rename(SERVICE_ID, VOLUME_ID, { name: 'assets' })
                .subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${VOLUMES_URL}/${VOLUME_ID}`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({ name: 'assets' });
            req.flush({ ...mountedVolume, name: 'assets' });

            expect(result).toEqual({ ...mountedVolume, name: 'assets' });
        });
    });

    describe('attach', () => {
        test('PUTs the mount to the mount URL of that volume', () => {
            repository.attach(SERVICE_ID, VOLUME_ID, {
                composeServiceName: 'worker', containerPath: '/data', readOnly: true,
            }).subscribe();

            const req = httpMock.expectOne(`${VOLUMES_URL}/${VOLUME_ID}/mount`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({
                composeServiceName: 'worker', containerPath: '/data', readOnly: true,
            });
            req.flush(null);
        });
    });

    describe('detach', () => {
        test('DELETEs the mount URL of that volume', () => {
            repository.detach(SERVICE_ID, VOLUME_ID).subscribe();

            const req = httpMock.expectOne(`${VOLUMES_URL}/${VOLUME_ID}/mount`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });
    });
});
