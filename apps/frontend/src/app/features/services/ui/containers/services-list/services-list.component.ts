import { Component, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { Service } from '../../../domain/models/service.model';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceCardComponent } from '../../components/service-card/service-card.component';

import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-services-list',
    templateUrl: './services-list.component.html',
    providers: [ServicesApiRepository],
    imports: [RouterLink, ServiceCardComponent],
})

/**
 * Services list component
 */
export class ServicesListComponent {
    private readonly repository = inject(ServicesApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    public readonly projectId = input.required<string>();

    protected readonly services = this.repository.services;

    constructor() {
        effect(() => {
            this.repository.projectId.set(this.projectId());
        });
    }

    protected view(service: Service): void {
        this.router.navigate(['/projects', this.projectId(), 'services', service.id]);
    }

    protected edit(service: Service): void {
        this.router.navigate(['/projects', this.projectId(), 'services', 'edit', service.id]);
    }

    protected async delete(id: string): Promise<void> {
        try {
            await lastValueFrom(this.repository.delete(id));

            this.toast.success('Service deleted', 'The service has been removed.');
            this.services.reload();
        } catch {
            this.toast.error('Could not delete service', 'Something went wrong. Please try again.');
        }
    }
}
