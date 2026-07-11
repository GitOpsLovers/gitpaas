import { CommonModule } from '@angular/common';
import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
    QueryList,
    ViewChildren,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import {
    LucideBox,
    LucideChevronDown,
    LucideEllipsis,
    LucideLayoutGrid,
    LucideServer,
    LucideSettings,
    LucideTable,
} from '@lucide/angular';
import { combineLatest, Subscription } from 'rxjs';

import { SidebarService } from '../../services/sidebar.service';
import { SidebarWidgetComponent } from '../sidebar-widget/sidebar-widget.component';

type NavIcon = 'grid' | 'box' | 'table' | 'server' | 'settings';

interface NavItem {
    name: string;
    icon: NavIcon;
    path?: string;
    new?: boolean;
    subItems?: Array<{ name: string; path: string; pro?: boolean; new?: boolean }>;
}

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    imports: [
        CommonModule,
        RouterModule,
        SidebarWidgetComponent,
        LucideLayoutGrid,
        LucideBox,
        LucideTable,
        LucideServer,
        LucideSettings,
        LucideEllipsis,
        LucideChevronDown,
    ],
})

/**
 * Sidebar component
 */
export class SidebarComponent implements OnInit, OnDestroy {
    public sidebarService: SidebarService = inject(SidebarService);

    private readonly router: Router = inject(Router);

    private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

    // Main nav items
    public navItems: NavItem[] = [
        {
            icon: 'grid',
            name: 'Dashboard',
            path: '/dashboard',
        },
        {
            icon: 'box',
            name: 'Projects',
            path: '/projects',
        },
        {
            icon: 'table',
            name: 'Repositories',
            path: '/dashboard',
        },
        {
            icon: 'server',
            name: 'Server',
            path: '/server',
        },
        {
            icon: 'settings',
            name: 'Settings',
            path: '/dashboard',
        },
    ];

    public openSubmenu: string | null | number = null;

    public subMenuHeights: Record<string, number> = {};

    @ViewChildren('subMenu') public subMenuRefs!: QueryList<ElementRef>;

    public readonly isExpanded$;

    public readonly isMobileOpen$;

    public readonly isHovered$;

    private readonly subscription: Subscription = new Subscription();

    constructor() {
        this.isExpanded$ = this.sidebarService.isExpanded$;
        this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
        this.isHovered$ = this.sidebarService.isHovered$;
    }

    public ngOnInit(): void {
        this.subscription.add(
            this.router.events.subscribe((event) => {
                if (event instanceof NavigationEnd) {
                    this.setActiveMenuFromRoute(this.router.url);
                }
            }),
        );

        this.subscription.add(
            combineLatest([this.isExpanded$, this.isMobileOpen$, this.isHovered$]).subscribe(
                ([isExpanded, isMobileOpen, isHovered]) => {
                    if (!isExpanded && !isMobileOpen && !isHovered) {
                        this.cdr.detectChanges();
                    }
                },
            ),
        );

        this.setActiveMenuFromRoute(this.router.url);
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public isActive(path: string): boolean {
        return this.router.url === path;
    }

    public toggleSubmenu(section: string, index: number): void {
        const key = `${section}-${index}`;

        if (this.openSubmenu === key) {
            this.openSubmenu = null;
            this.subMenuHeights[key] = 0;
        } else {
            this.openSubmenu = key;

            setTimeout(() => {
                const el = document.getElementById(key);
                if (el) {
                    this.subMenuHeights[key] = el.scrollHeight;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    public onSidebarMouseEnter(): void {
        this.isExpanded$
            .subscribe((expanded) => {
                if (!expanded) {
                    this.sidebarService.setHovered(true);
                }
            })
            .unsubscribe();
    }

    public onSubmenuClick(): void {
        this.isMobileOpen$
            .subscribe((isMobile) => {
                if (isMobile) {
                    this.sidebarService.setMobileOpen(false);
                }
            })
            .unsubscribe();
    }

    private setActiveMenuFromRoute(currentUrl: string): void {
        const menuGroups = [{ items: this.navItems, prefix: 'main' }];

        menuGroups.forEach((group) => {
            group.items.forEach((nav, i) => {
                if (nav.subItems) {
                    nav.subItems.forEach((subItem) => {
                        if (currentUrl === subItem.path) {
                            const key = `${group.prefix}-${i}`;
                            this.openSubmenu = key;

                            setTimeout(() => {
                                const el = document.getElementById(key);
                                if (el) {
                                    this.subMenuHeights[key] = el.scrollHeight;
                                    this.cdr.detectChanges();
                                }
                            });
                        }
                    });
                }
            });
        });
    }
}
