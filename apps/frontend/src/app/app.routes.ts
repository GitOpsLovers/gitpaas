import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('@layout/ui/containers/layout/layout').then((m) => m.LayoutComponent),
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full',
            },
            {
                path: 'dashboard',
                loadComponent: () => import('@pages/dashboard/dashboard').then((m) => m.DashboardPage),
                title: 'Dashboard | Artifactory',
            },
            {
                path: 'projects',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('@pages/projects/list/list').then((m) => m.ProjectsListPage),
                        title: 'Projects | Artifactory',
                    },
                    {
                        path: 'add',
                        loadComponent: () => import('@pages/projects/add/add').then((m) => m.ProjectsAddPage),
                        title: 'Add project | Artifactory',
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('@pages/projects/edit/edit').then((m) => m.ProjectsEditPage),
                        title: 'Edit project | Artifactory',
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
