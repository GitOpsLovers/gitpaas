import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Tracks sidebar UI state: expanded (desktop), hovered (collapsed peek) and
 * mobile-open (off-canvas drawer).
 */
@Injectable({ providedIn: 'root' })
export class SidebarService {
    private readonly isExpandedSubject = new BehaviorSubject<boolean>(true);
    private readonly isMobileOpenSubject = new BehaviorSubject<boolean>(false);
    private readonly isHoveredSubject = new BehaviorSubject<boolean>(false);

    public readonly isExpanded$ = this.isExpandedSubject.asObservable();
    public readonly isMobileOpen$ = this.isMobileOpenSubject.asObservable();
    public readonly isHovered$ = this.isHoveredSubject.asObservable();

    public setExpanded(value: boolean): void {
        this.isExpandedSubject.next(value);
    }

    public toggleExpanded(): void {
        this.isExpandedSubject.next(!this.isExpandedSubject.value);
    }

    public setMobileOpen(value: boolean): void {
        this.isMobileOpenSubject.next(value);
    }

    public toggleMobileOpen(): void {
        this.isMobileOpenSubject.next(!this.isMobileOpenSubject.value);
    }

    public setHovered(value: boolean): void {
        this.isHoveredSubject.next(value);
    }
}
