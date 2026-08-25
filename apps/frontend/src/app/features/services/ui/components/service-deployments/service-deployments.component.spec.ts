/* eslint-disable no-secrets/no-secrets */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { Deployment } from '@gitpaas/contracts';

import { ServiceDeploymentsComponent } from './service-deployments.component';

import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';

const deployment: Deployment = {
    id: 'dp-1',
    serviceId: 'sv-1',
    status: 'success',
    branch: 'main',
    commit: 'abcdef1234567890',
    commitMessage: 'Add the health check',
    composerPath: 'docker-compose.yml',
    triggeredBy: 'us-1',
    error: null,
    createdAt: '2026-01-01T10:00:00.000Z',
    finishedAt: '2026-01-01T10:00:12.000Z',
};

describe('ServiceDeploymentsComponent', () => {
    let fixture: ComponentFixture<ServiceDeploymentsComponent>;
    let deployed: number;
    let viewed: Deployment[];

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const deployButton = (): HTMLButtonElement =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    const confirmModal = (): ConfirmModalComponent =>
        fixture.debugElement.query(By.directive(ConfirmModalComponent)).componentInstance;

    const create = (deployments: Deployment[] = [], deploying = false, loading = false): void => {
        fixture = TestBed.createComponent(ServiceDeploymentsComponent);
        fixture.componentRef.setInput('deployments', deployments);
        fixture.componentRef.setInput('deploying', deploying);
        fixture.componentRef.setInput('loading', loading);
        deployed = 0;
        viewed = [];
        // eslint-disable-next-line no-return-assign
        fixture.componentInstance.deploy.subscribe(() => (deployed += 1));
        fixture.componentInstance.view.subscribe((value) => viewed.push(value));
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ServiceDeploymentsComponent],
        });
    });

    describe('the deploy button', () => {
        test('shows the deploy label and stays enabled while idle', () => {
            create([deployment]);

            expect(deployButton().textContent).toContain('Deploy');
            expect(deployButton().disabled).toBe(false);
        });

        test('shows the progress label and disables itself while a deployment runs', () => {
            create([deployment], true);

            expect(deployButton().textContent).toContain('Deploying…');
            expect(deployButton().disabled).toBe(true);
        });

        test('follows a later change of the deploying input', () => {
            create([deployment]);

            fixture.componentRef.setInput('deploying', true);
            fixture.detectChanges();

            expect(deployButton().disabled).toBe(true);
        });

        test('asks for a confirmation instead of emitting when the user clicks it', () => {
            create([deployment]);

            deployButton().click();
            fixture.detectChanges();

            expect(deployed).toBe(0);
            expect(confirmModal().open()).toBe(true);
        });

        test('emits the deployment once the user confirms, and closes the modal', () => {
            create([deployment]);
            deployButton().click();
            fixture.detectChanges();

            confirmModal().confirmed.emit();
            fixture.detectChanges();

            expect(deployed).toBe(1);
            expect(confirmModal().open()).toBe(false);
        });

        test('does not emit the deployment when the user cancels', () => {
            create([deployment]);
            deployButton().click();
            fixture.detectChanges();

            confirmModal().cancelled.emit();
            fixture.detectChanges();

            expect(deployed).toBe(0);
            expect(confirmModal().open()).toBe(false);
        });
    });

    describe('the list', () => {
        test('shows the short commit, the branch and the duration of a deployment', () => {
            create([deployment]);

            expect(text()).toContain('abcdef1');
            expect(text()).toContain('main');
            expect(text()).toContain('12s');
        });

        test('emits the deployment that the user wants to view', () => {
            create([deployment]);

            const view = (fixture.nativeElement as HTMLElement).querySelectorAll('button')[1];
            view.click();

            expect(viewed).toEqual([deployment]);
        });

        test('keeps the deploy button when the history is empty', () => {
            create([]);

            expect(text()).toContain('No deployments yet.');
            expect(deployButton().textContent).toContain('Deploy');
        });

        test('announces the loading of the history', () => {
            create([], false, true);

            expect(text()).toContain('Loading deployments…');
        });
    });
});
