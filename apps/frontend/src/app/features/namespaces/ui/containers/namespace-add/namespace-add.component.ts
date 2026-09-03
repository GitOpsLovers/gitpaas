import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { NamespacesApiRepository } from '../../../infrastructure/api/namespaces-api.repository';
import { NamespaceFormComponent, NamespaceFormValue } from '../../components/namespace-form/namespace-form.component';

import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-namespace-add',
    templateUrl: './namespace-add.component.html',
    imports: [NamespaceFormComponent],
})

/**
 * Add namespace container component
 */
export class NamespaceAddComponent {
    private readonly repository = inject(NamespacesApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    protected readonly submitting = signal(false);

    protected async create(value: NamespaceFormValue): Promise<void> {
        this.submitting.set(true);

        try {
            const namespace = await lastValueFrom(this.repository.create(value));

            this.toast.success('Namespace created', `“${namespace.name}” has been created.`);
            this.router.navigate(['/namespaces']);
        } catch {
            this.toast.error('Could not create namespace', 'Something went wrong. Please try again.');
            this.submitting.set(false);
        }
    }
}
