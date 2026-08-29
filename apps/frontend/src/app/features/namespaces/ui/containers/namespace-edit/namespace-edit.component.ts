import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import { NamespaceFormComponent } from '@features/namespaces/ui/components/namespace-form/namespace-form.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-namespace-edit',
    templateUrl: './namespace-edit.component.html',
    imports: [NamespaceFormComponent],
})

/**
 * Smart container that loads a namespace, saves edits and navigates back to the list.
 */
export class NamespaceEditComponent {
    private readonly repository = inject(NamespacesApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly namespace = this.repository.namespaceById(() => this.id);

    protected readonly initialName = computed(() => this.namespace.value()?.name ?? '');

    protected readonly loading = computed(() => this.namespace.isLoading());

    protected readonly submitting = signal(false);

    protected async update(name: string): Promise<void> {
        this.submitting.set(true);

        try {
            const namespace = await lastValueFrom(this.repository.update(this.id, { name }));

            this.toast.success('Namespace updated', `“${namespace.name}” has been saved.`);
            this.router.navigate(['/namespaces']);
        } catch {
            this.toast.error('Could not update namespace', 'Something went wrong. Please try again.');
            this.submitting.set(false);
        }
    }
}
