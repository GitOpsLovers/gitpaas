import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })

/**
 * Theme service
 */
export class ThemeService {
    private readonly themeSubject = new BehaviorSubject<Theme>('light');

    public readonly theme$ = this.themeSubject.asObservable();

    constructor() {
        const savedTheme = (localStorage.getItem('theme') as Theme) || 'dark';

        this.setTheme(savedTheme);
    }

    /**
     * Toggles the current theme between light and dark
     */
    public toggleTheme(): void {
        this.setTheme(this.themeSubject.value === 'light' ? 'dark' : 'light');
    }

    /**
     * Sets the current theme and updates the local storage and document class
     */
    public setTheme(theme: Theme): void {
        this.themeSubject.next(theme);
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }
}
