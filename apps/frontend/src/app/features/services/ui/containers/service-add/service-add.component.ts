import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceFormComponent } from '../../components/service-form/service-form.component';

@Component({
    selector: 'app-service-add',
    templateUrl: './service-add.component.html',
    providers: [ServicesApiRepository],
    imports: [ServiceFormComponent],
})

/**
 * Service add container component
 */
export class ServiceAddComponent {
    private readonly repository = inject(ServicesApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    protected readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

    protected readonly submitting = signal(false);

    protected create(name: string): void {
        this.submitting.set(true);

        this.repository.create({ name, projectId: this.projectId }).subscribe({
            next: () => this.router.navigate(['/projects', this.projectId]),
            error: () => { this.submitting.set(false); },
        });
    }
}
