import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Project } from '../../../domain/models/project.model';
import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';

import { ServicesListComponent } from '@features/services/ui/containers/services-list/services-list.component';

@Component({
    selector: 'app-project-detail',
    templateUrl: './project-detail.component.html',
    providers: [ProjectsApiRepository],
    imports: [RouterLink, ServicesListComponent],
})

/**
 * Project detail container component
 */
export class ProjectDetailComponent implements OnInit {
    private readonly repository = inject(ProjectsApiRepository);

    private readonly route = inject(ActivatedRoute);

    protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';

    protected readonly project = signal<Project | null>(null);

    public ngOnInit(): void {
        this.repository.getById(this.id).subscribe({
            next: (project) => { this.project.set(project); },
        });
    }
}
