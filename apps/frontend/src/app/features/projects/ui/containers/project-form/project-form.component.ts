import { Component, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-project-form',
    templateUrl: './project-form.component.html',
    imports: [RouterLink],
})
export class ProjectFormComponent {
    public readonly initialName = input('');

    public readonly submitting = input(false);

    public readonly submitLabel = input('Save');

    public readonly save = output<string>();

    protected readonly name = linkedSignal(() => this.initialName());

    protected onSubmit(event: Event): void {
        event.preventDefault();

        const value = this.name().trim();

        if (value) {
            this.save.emit(value);
        }
    }

    protected onInput(event: Event): void {
        this.name.set((event.target as HTMLInputElement).value);
    }
}
