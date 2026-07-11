import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateProjectDto } from '../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../domain/dtos/update-project.dto';
import { Project } from '../../domain/models/project.model';

@Injectable()

/**
 * Projects API repository
 */
export class ProjectsApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = 'http://localhost:3000/api/v1/projects';

    /**
     * Resource with all projects
     */
    public readonly projects = httpResource<Project[]>(() => this.url);

    /**
     * Resource with a single project by id
     *
     * @param id Accessor returning the project identifier
     *
     * @returns Resource that resolves to the found project
     */
    public projectById(id: () => string | undefined) {
        return httpResource<Project>(() => {
            const projectId = id();

            return projectId ? `${this.url}/${projectId}` : undefined;
        });
    }

    /**
     * Creates a new project
     *
     * @param dto Data for creating the project
     *
     * @returns Created project
     */
    public create(dto: CreateProjectDto): Observable<Project> {
        return this.http.post<Project>(this.url, dto);
    }

    /**
     * Updates an existing project
     *
     * @param id Project identifier
     * @param dto Data for updating the project
     *
     * @returns Updated project
     */
    public update(id: string, dto: UpdateProjectDto): Observable<Project> {
        return this.http.put<Project>(`${this.url}/${id}`, dto);
    }

    /**
     * Deletes a project
     *
     * @param id Project identifier
     */
    public delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`);
    }
}
