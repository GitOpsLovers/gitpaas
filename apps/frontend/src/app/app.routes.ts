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
        ],
    },
    {
        path: '**',
        redirectTo: 'dashboard',
    },
];
