import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceFormComponent } from '../../components/service-form/service-form.component';

@Component({
    selector: 'app-service-edit',
    templateUrl: './service-edit.component.html',
    providers: [ServicesApiRepository],
    imports: [ServiceFormComponent],
})

/**
 * Service edit container component
 */
export class ServiceEditComponent implements OnInit {
    private readonly repository = inject(ServicesApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    protected readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly id = this.route.snapshot.paramMap.get('serviceId') ?? '';

    protected readonly initialName = signal('');

    protected readonly loading = signal(true);

    protected readonly submitting = signal(false);

    public ngOnInit(): void {
        this.repository.getById(this.id).subscribe({
            next: (service) => {
                this.initialName.set(service.name);
                this.loading.set(false);
            },
            error: () => { this.loading.set(false); },
        });
    }

    protected update(name: string): void {
        this.submitting.set(true);

        this.repository.update(this.id, { name }).subscribe({
            next: () => this.router.navigate(['/projects', this.projectId]),
            error: () => { this.submitting.set(false); },
        });
    }
}
