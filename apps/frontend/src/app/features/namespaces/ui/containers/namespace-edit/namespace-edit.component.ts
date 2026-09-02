import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import {
    NamespaceFormComponent,
    NamespaceFormValue,
} from '@features/namespaces/ui/components/namespace-form/namespace-form.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-namespace-edit',
    templateUrl: './namespace-edit.component.html',
    imports: [ComponentCardComponent, NamespaceFormComponent, SkeletonComponent],
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

    protected readonly initialDescription = computed(() => this.namespace.value()?.description ?? '');

    protected readonly loading = computed(() => this.namespace.isLoading());

    protected readonly submitting = signal(false);

    protected async update(value: NamespaceFormValue): Promise<void> {
        this.submitting.set(true);

        try {
            const namespace = await lastValueFrom(this.repository.update(this.id, value));

            this.toast.success('Namespace updated', `“${namespace.name}” has been saved.`);
            this.router.navigate(['/namespaces']);
        } catch {
            this.toast.error('Could not update namespace', 'Something went wrong. Please try again.');
            this.submitting.set(false);
        }
    }
}
