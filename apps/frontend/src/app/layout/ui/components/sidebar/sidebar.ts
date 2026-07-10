import { CommonModule } from '@angular/common';
import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    QueryList,
    ViewChildren,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';

import { SidebarWidgetComponent } from './sidebar-widget';

import { SidebarService } from '@layout/ui/services/sidebar.service';
import { SafeHtmlPipe } from '@shared/pipes/safe-html.pipe';

interface NavItem {
    name: string;
    icon: string;
    path?: string;
    new?: boolean;
    subItems?: Array<{ name: string; path: string; pro?: boolean; new?: boolean }>;
}

const GRID_ICON = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z" fill="currentColor"></path></svg>';
const BOX_ICON = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.665 3.75618C11.8762 3.65061 12.1247 3.65061 12.3358 3.75618L18.7807 6.97853L12.3358 10.2009C12.1247 10.3064 11.8762 10.3064 11.665 10.2009L5.22014 6.97853L11.665 3.75618ZM4.29297 8.19199V16.0946C4.29297 16.3787 4.45347 16.6384 4.70757 16.7654L11.25 20.0365V11.6512C11.1631 11.6205 11.0777 11.5843 10.9942 11.5425L4.29297 8.19199ZM12.75 20.037L19.2933 16.7654C19.5474 16.6384 19.7079 16.3787 19.7079 16.0946V8.19199L13.0066 11.5425C12.9229 11.5844 12.8372 11.6207 12.75 11.6515V20.037ZM13.0066 2.41453C12.3732 2.09783 11.6277 2.09783 10.9942 2.41453L4.03676 5.89316C3.27449 6.27429 2.79297 7.05339 2.79297 7.90563V16.0946C2.79297 16.9468 3.27448 17.7259 4.03676 18.1071L10.9942 21.5857C11.6277 21.9024 12.3732 21.9024 13.0066 21.5857L19.9641 18.1071C20.7264 17.7259 21.2079 16.9468 21.2079 16.0946V7.90563C21.2079 7.05339 20.7264 6.27429 19.9641 5.89316L13.0066 2.41453Z" fill="currentColor"></path></svg>';
const TABLE_ICON = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 5.5C3.25 4.25736 4.25736 3.25 5.5 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V18.5C20.75 19.7426 19.7426 20.75 18.5 20.75H5.5C4.25736 20.75 3.25 19.7426 3.25 18.5V5.5ZM5.5 4.75C5.08579 4.75 4.75 5.08579 4.75 5.5V8.58325L19.25 8.58325V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H5.5ZM19.25 10.0833H15.416V13.9165H19.25V10.0833ZM13.916 10.0833L10.083 10.0833V13.9165L13.916 13.9165V10.0833ZM8.58301 10.0833H4.75V13.9165H8.58301V10.0833ZM4.75 18.5V15.4165H8.58301V19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5ZM10.083 19.25V15.4165L13.916 15.4165V19.25H10.083ZM15.416 19.25V15.4165H19.25V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15.416Z" fill="currentColor"></path></svg>';
const FORM_ICON = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H18.5001C19.7427 20.75 20.7501 19.7426 20.7501 18.5V5.5C20.7501 4.25736 19.7427 3.25 18.5001 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H18.5001C18.9143 4.75 19.2501 5.08579 19.2501 5.5V18.5C19.2501 18.9142 18.9143 19.25 18.5001 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V5.5ZM6.25005 9.7143C6.25005 9.30008 6.58583 8.9643 7.00005 8.9643L17 8.96429C17.4143 8.96429 17.75 9.30008 17.75 9.71429C17.75 10.1285 17.4143 10.4643 17 10.4643L7.00005 10.4643C6.58583 10.4643 6.25005 10.1285 6.25005 9.7143ZM6.25005 14.2857C6.25005 13.8715 6.58583 13.5357 7.00005 13.5357H17C17.4143 13.5357 17.75 13.8715 17.75 14.2857C17.75 14.6999 17.4143 15.0357 17 15.0357H7.00005C6.58583 15.0357 6.25005 14.6999 6.25005 14.2857Z" fill="currentColor"></path></svg>';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.html',
    imports: [CommonModule, RouterModule, SafeHtmlPipe, SidebarWidgetComponent],
})
export class SidebarComponent implements OnInit, OnDestroy {
    // Main nav items
    public navItems: NavItem[] = [
        {
            icon: GRID_ICON,
            name: 'Dashboard',
            path: '/dashboard',
        },
        {
            icon: BOX_ICON,
            name: 'Applications',
            path: '/dashboard',
        },
        {
            icon: TABLE_ICON,
            name: 'Repositories',
            path: '/dashboard',
        },
    ];

    // Others nav items
    public othersItems: NavItem[] = [
        {
            icon: FORM_ICON,
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

    constructor(
        public sidebarService: SidebarService,
        private readonly router: Router,
        private readonly cdr: ChangeDetectorRef,
    ) {
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
        const menuGroups = [
            { items: this.navItems, prefix: 'main' },
            { items: this.othersItems, prefix: 'others' },
        ];

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
