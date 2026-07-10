import { Component, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Service } from '../../../domain/models/service.model';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceCardComponent } from '../../components/service-card/service-card.component';

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

    protected delete(id: string): void {
        this.repository.delete(id).subscribe(() => this.services.reload());
    }
}
