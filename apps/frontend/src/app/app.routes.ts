import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('@layout/ui/containers/layout/layout.component').then((m) => m.LayoutComponent),
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full',
            },
            {
                path: 'dashboard',
                loadComponent: () => import('@pages/dashboard/dashboard.component').then((m) => m.DashboardPage),
                title: 'Dashboard | Artifactory',
            },
            {
                path: 'server',
                loadComponent: () => import('@pages/server/server.component').then((m) => m.ServerPage),
                title: 'Server | Artifactory',
            },
            {
                path: 'projects',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('@pages/projects/list/projects-list.component').then((m) => m.ProjectsListPage),
                        title: 'Projects | Artifactory',
                    },
                    {
                        path: 'add',
                        loadComponent: () => import('@pages/projects/add/project-add.component').then((m) => m.ProjectsAddPage),
                        title: 'Add project | Artifactory',
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('@pages/projects/edit/project-edit.component').then((m) => m.ProjectsEditPage),
                        title: 'Edit project | Artifactory',
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('@pages/projects/detail/project-detail.component').then((m) => m.ProjectDetailPage),
                        title: 'Project | Artifactory',
                    },
                    {
                        path: ':id/services/add',
                        loadComponent: () => import('@pages/services/add/service-add.component').then((m) => m.ServicesAddPage),
                        title: 'Add service | Artifactory',
                    },
                    {
                        path: ':id/services/edit/:serviceId',
                        loadComponent: () => import('@pages/services/edit/service-edit.component').then((m) => m.ServicesEditPage),
                        title: 'Edit service | Artifactory',
                    },
                    {
                        path: ':id/services/:serviceId',
                        redirectTo: ':id/services/:serviceId/general',
                        pathMatch: 'full',
                    },
                    {
                        path: ':id/services/:serviceId/:tab',
                        loadComponent: () => import('@pages/services/detail/service-detail.component').then((m) => m.ServiceDetailPage),
                        title: 'Service | Artifactory',
                    },
                ],
            },
        ],
    },
    {
        path: '**',
        redirectTo: 'dashboard',
    },
];
