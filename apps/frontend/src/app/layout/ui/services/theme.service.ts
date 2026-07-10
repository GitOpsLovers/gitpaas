import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type Theme = 'light' | 'dark';

/**
 * Manages the light/dark colour theme by toggling the `dark` class on the
 * document root and persisting the choice in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly themeSubject = new BehaviorSubject<Theme>('light');

    public readonly theme$ = this.themeSubject.asObservable();

    constructor() {
        const savedTheme = (localStorage.getItem('theme') as Theme) || 'light';
        this.setTheme(savedTheme);
    }

    public toggleTheme(): void {
        this.setTheme(this.themeSubject.value === 'light' ? 'dark' : 'light');
    }

    public setTheme(theme: Theme): void {
        this.themeSubject.next(theme);
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }
}
