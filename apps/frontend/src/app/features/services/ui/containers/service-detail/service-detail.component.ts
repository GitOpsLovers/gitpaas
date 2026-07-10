import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Service } from '../../../domain/models/service.model';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';

import { DeployActionsComponent } from '@features/services/ui/components/deploy-actions/deploy-actions.component';
import { ProviderComponent } from '@features/services/ui/components/provider/provider.component';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';

type ServiceTab = 'general' | 'deployments' | 'logs';

interface Deployment {
    version: string;
    environment: string;
    status: 'Success' | 'Failed' | 'In progress';
    triggeredBy: string;
    date: string;
}

interface LogLine {
    time: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
}

@Component({
    selector: 'app-service-detail',
    templateUrl: './service-detail.component.html',
    providers: [ServicesApiRepository, ProjectsApiRepository],
    imports: [BreadcrumbComponent, ComponentCardComponent, DeployActionsComponent, ProviderComponent],
})

/**
 * Smart container that loads a service and shows its details across tabs.
 */
export class ServiceDetailComponent implements OnInit {
    private readonly repository = inject(ServicesApiRepository);

    private readonly projectsRepository = inject(ProjectsApiRepository);

    private readonly route = inject(ActivatedRoute);

    protected readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly id = this.route.snapshot.paramMap.get('serviceId') ?? '';

    protected readonly service = signal<Service | null>(null);

    private readonly projectName = signal('Project');

    protected readonly activeTab = signal<ServiceTab>('general');

    protected readonly tabs: Array<{ id: ServiceTab; label: string }> = [
        { id: 'general', label: 'General' },
        { id: 'deployments', label: 'Deployments' },
        { id: 'logs', label: 'Logs' },
    ];

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: 'Projects', link: '/projects' },
        { label: this.projectName(), link: ['/projects', this.projectId] },
        { label: this.service()?.name ?? 'Service' },
    ]);

    // --- Dummy data (placeholder until wired to the backend) ---

    protected readonly deployments: Deployment[] = [
        {
            version: 'v1.4.2', environment: 'production', status: 'Success', triggeredBy: 'marc.fernandez', date: '2026-07-09 14:32',
        },
        {
            version: 'v1.4.1', environment: 'production', status: 'Success', triggeredBy: 'ci-bot', date: '2026-07-08 11:05',
        },
        {
            version: 'v1.4.0', environment: 'staging', status: 'Failed', triggeredBy: 'marc.fernandez', date: '2026-07-07 09:48',
        },
        {
            version: 'v1.3.9', environment: 'staging', status: 'Success', triggeredBy: 'ci-bot', date: '2026-07-06 16:20',
        },
    ];

    protected readonly logs: LogLine[] = [
        { time: '14:32:01', level: 'INFO', message: 'Starting deployment of v1.4.2' },
        { time: '14:32:03', level: 'INFO', message: 'Pulling image registry.internal/app:v1.4.2' },
        { time: '14:32:08', level: 'INFO', message: 'Image pulled (312 MB) in 4.7s' },
        { time: '14:32:10', level: 'WARN', message: 'Health check retry 1/3 on :8080/healthz' },
        { time: '14:32:14', level: 'INFO', message: 'Container started successfully' },
        { time: '14:32:15', level: 'ERROR', message: 'Metrics exporter failed to bind port 9090, retrying' },
        { time: '14:32:17', level: 'INFO', message: 'Metrics exporter bound on port 9091' },
        { time: '14:32:18', level: 'INFO', message: 'Deployment complete — 2/2 instances healthy' },
    ];

    public ngOnInit(): void {
        this.repository.getById(this.id).subscribe({
            next: (service) => { this.service.set(service); },
        });

        this.projectsRepository.getById(this.projectId).subscribe({
            next: (project) => { this.projectName.set(project.name); },
        });
    }

    protected tabButtonClass(tab: ServiceTab): string {
        const base = '-mb-px inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition';
        const active = 'border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400';
        const inactive = 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300';

        return `${base} ${this.activeTab() === tab ? active : inactive}`;
    }

    protected statusBadgeClass(status: Deployment['status']): string {
        switch (status) {
            case 'Success':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'Failed':
                return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    }

    protected logLevelClass(level: LogLine['level']): string {
        switch (level) {
            case 'ERROR':
                return 'text-red-400';
            case 'WARN':
                return 'text-amber-400';
            default:
                return 'text-emerald-400';
        }
    }
}
