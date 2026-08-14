import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateProjectDto } from '../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../domain/dtos/update-project.dto';
import { Project } from '../../domain/models/project.model';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Projects API repository
 */
export class ProjectsApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = `${environment.apiBaseUrl}/namespaces`;

    /**
     * Namespace scoping every projects request
     */
    public readonly namespaceId = signal<string | undefined>(undefined);

    /**
     * Resource with all projects of the current namespace
     */
    public readonly projects = httpResource<Project[]>(() => {
        const namespaceId = this.namespaceId();

        return namespaceId ? this.projectsUrl(namespaceId) : undefined;
    });

    /**
     * Resource with a single project by id
     *
     * @param id Accessor returning the project identifier
     *
     * @returns Resource that resolves to the found project
     */
    public projectById(id: () => string | undefined) {
        return httpResource<Project>(() => {
            const namespaceId = this.namespaceId();
            const projectId = id();

            return namespaceId && projectId ? `${this.projectsUrl(namespaceId)}/${projectId}` : undefined;
        });
    }

    /**
     * Creates a new project
     *
     * @param namespaceId Namespace identifier
     * @param dto Data for creating the project
     *
     * @returns Created project
     */
    public create(namespaceId: string, dto: CreateProjectDto): Observable<Project> {
        return this.http.post<Project>(this.projectsUrl(namespaceId), dto);
    }

    /**
     * Updates an existing project
     *
     * @param namespaceId Namespace identifier
     * @param id Project identifier
     * @param dto Data for updating the project
     *
     * @returns Updated project
     */
    public update(namespaceId: string, id: string, dto: UpdateProjectDto): Observable<Project> {
        return this.http.put<Project>(`${this.projectsUrl(namespaceId)}/${id}`, dto);
    }

    /**
     * Deletes a project from the current namespace
     *
     * @param id Project identifier
     */
    public delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.projectsUrl(this.namespaceId() ?? '')}/${id}`);
    }

    /**
     * Builds the projects collection URL for a namespace
     *
     * @param namespaceId Namespace identifier
     *
     * @returns Projects collection URL
     */
    private projectsUrl(namespaceId: string): string {
        return `${this.url}/${namespaceId}/projects`;
    }
}
