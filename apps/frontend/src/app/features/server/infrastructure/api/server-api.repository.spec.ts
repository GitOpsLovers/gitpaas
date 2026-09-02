import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
    ControlPlaneDomainCheckResult,
    OrphanRemovalResult,
    PlatformSettings,
    PlatformUpdateStatus,
    PruneResult,
    ReadinessResult,
    ServerStatus,
    UpdatePlatformSettingsResult,
} from '@gitpaas/contracts';

import { ServerApiRepository } from './server-api.repository';

import { environment } from '@environments/environment';

const BASE_URL = `${environment.apiBaseUrl}/server`;

const readiness: ReadinessResult = {
    status: 'ok',
    dependencies: [{ name: 'database', status: 'up' }],
};

const status: ServerStatus = {
    connected: true,
    serverVersion: '27.1.1',
    operatingSystem: 'Debian GNU/Linux 12',
    containers: 4,
    images: 12,
};

const pruned: PruneResult = { deletedCount: 2, spaceReclaimed: 2048 };

const orphans: OrphanRemovalResult = { removed: 1, names: ['gitpaas-api'] };

const settings: PlatformSettings = { logRetentionDays: 30, gitpaasDomain: 'gitpaas.dev' };

const domainCheck: ControlPlaneDomainCheckResult = {
    warning: {
        host: 'gitpaas.dev',
        resolvedAddresses: ['104.16.0.1'],
        hostAddress: '203.0.113.10',
        reason: 'cdn',
        provider: 'Cloudflare',
        message: 'The domain gitpaas.dev resolves to an address of Cloudflare.',
    },
};

const updateStatus: PlatformUpdateStatus = {
    installedVersion: '1.4.0',
    latestVersion: '1.5.0',
    update: null,
};

/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}

describe('ServerApiRepository', () => {
    let repository: ServerApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ServerApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(ServerApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('readiness', () => {
        test('reads the readiness of the dependencies of the server', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.readiness());
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/readiness`);
            expect(req.request.method).toBe('GET');
            req.flush(readiness);

            await settle();

            expect(resource.value()).toEqual(readiness);
        });
    });

    describe('status', () => {
        test('reads the state of the daemon of the server', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.status());
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/status`);
            expect(req.request.method).toBe('GET');
            req.flush(status);

            await settle();

            expect(resource.value()).toEqual(status);
        });
    });

    describe('the prune of a resource', () => {
        test('prunes the images of the server', () => {
            let result: PruneResult | undefined;

            repository.pruneImages().subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/prune/images`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush(pruned);

            expect(result).toEqual(pruned);
        });

        test('prunes the volumes of the server', () => {
            let result: PruneResult | undefined;

            repository.pruneVolumes().subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/prune/volumes`);
            expect(req.request.method).toBe('POST');
            req.flush(pruned);

            expect(result).toEqual(pruned);
        });

        test('prunes the containers of the server', () => {
            let result: PruneResult | undefined;

            repository.pruneContainers().subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/prune/containers`);
            expect(req.request.method).toBe('POST');
            req.flush(pruned);

            expect(result).toEqual(pruned);
        });

        test('removes the containers that are orphaned', () => {
            let result: OrphanRemovalResult | undefined;

            repository.removeOrphanedContainers().subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/containers/orphaned`);
            expect(req.request.method).toBe('POST');
            req.flush(orphans);

            expect(result).toEqual(orphans);
        });
    });

    describe('the parameters of the platform', () => {
        test('reads the parameters of the deployment system', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.settings());
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/settings`);
            expect(req.request.method).toBe('GET');
            req.flush(settings);

            await settle();

            expect(resource.value()).toEqual(settings);
        });

        test('writes the parameters of the deployment system, and reads the advice of the check', () => {
            let result: UpdatePlatformSettingsResult | undefined;
            const saved: UpdatePlatformSettingsResult = { ...settings, domainWarning: null };

            repository.updateSettings({ ...settings, acknowledgeDomainWarning: true })
                .subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/settings`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({ ...settings, acknowledgeDomainWarning: true });
            req.flush(saved);

            expect(result).toEqual(saved);
        });
    });

    describe('the check of the domain', () => {
        // eslint-disable-next-line vitest/expect-expect
        test('checks no domain while the caller gives none', () => {
            const host = signal<string | undefined>(undefined);

            TestBed.runInInjectionContext(() => repository.domainCheck(() => host()));
            TestBed.tick();

            httpMock.expectNone(() => true);
        });

        test('asks for the advice of the check of the host that the caller gives', async () => {
            const host = signal<string | undefined>(undefined);
            const resource = TestBed.runInInjectionContext(() => repository.domainCheck(() => host()));
            TestBed.tick();

            host.set('gitpaas.dev');
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/settings/domain-check`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ gitpaasDomain: 'gitpaas.dev' });
            req.flush(domainCheck);

            await settle();

            expect(resource.value()).toEqual(domainCheck);
        });
    });

    describe('the state of the update', () => {
        // eslint-disable-next-line vitest/expect-expect
        test('reads no state while the caller allows none', () => {
            const enabled = signal(false);

            TestBed.runInInjectionContext(() => repository.updateStatus(() => enabled()));
            TestBed.tick();

            httpMock.expectNone(() => true);
        });

        test('reads the state of the update once the caller allows it', async () => {
            const enabled = signal(false);
            const resource = TestBed.runInInjectionContext(() => repository.updateStatus(() => enabled()));
            TestBed.tick();

            enabled.set(true);
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/update`);
            expect(req.request.method).toBe('GET');
            req.flush(updateStatus);

            await settle();

            expect(resource.value()).toEqual(updateStatus);
        });
    });

    describe('checkUpdate', () => {
        test('asks for the latest release at once, and answers the state of the update', () => {
            let result: PlatformUpdateStatus | undefined;

            repository.checkUpdate().subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/update/check`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush(updateStatus);

            expect(result).toEqual(updateStatus);
        });
    });

    describe('startUpdate', () => {
        test('starts the update of the platform', () => {
            let result: PlatformUpdateStatus | undefined;

            repository.startUpdate().subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/update`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush(updateStatus);

            expect(result).toEqual(updateStatus);
        });
    });
});
