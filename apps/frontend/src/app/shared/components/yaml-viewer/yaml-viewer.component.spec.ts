import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YamlViewerComponent } from './yaml-viewer.component';

const TEXT = 'services:\n  web:\n    image: nginx:1.27\n';

describe('YamlViewerComponent', () => {
    let fixture: ComponentFixture<YamlViewerComponent>;
    let writeText: ReturnType<typeof vi.fn>;
    let createObjectURL: ReturnType<typeof vi.fn>;
    let revokeObjectURL: ReturnType<typeof vi.fn>;

    const create = (text: string | null = TEXT): void => {
        fixture = TestBed.createComponent(YamlViewerComponent);
        fixture.componentRef.setInput('text', text);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const button = (name: string): HTMLButtonElement | null =>
        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`button[name="${name}"]`);

    const document = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('code');

    beforeEach(() => {
        writeText = vi.fn().mockResolvedValue(undefined);
        createObjectURL = vi.fn().mockReturnValue('blob:the-document');
        revokeObjectURL = vi.fn();

        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
        Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });

        TestBed.configureTestingModule({ imports: [YamlViewerComponent] });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('shows the whole text of the document', () => {
        create();

        expect(document()?.textContent).toBe(TEXT);
    });

    test('marks the keys and the values of the document with the classes of the highlighting', () => {
        create();

        expect(document()?.querySelector('.hljs-attr')).not.toBeNull();
        expect(document()?.innerHTML).toContain('<span');
    });

    test('shows the message of an empty document when it holds no text', () => {
        create(null);

        expect(text()).toContain('No YAML document available.');
        expect(document()).toBeNull();
    });

    test('shows the message that the caller gives for an empty document', () => {
        create(null);
        fixture.componentRef.setInput('emptyMessage', 'This service holds no Compose file.');
        fixture.detectChanges();

        expect(text()).toContain('This service holds no Compose file.');
        expect(text()).not.toContain('No YAML document available.');
    });

    test('shows the skeleton instead of the document while the text loads', () => {
        create();
        fixture.componentRef.setInput('loading', true);
        fixture.detectChanges();

        expect(document()).toBeNull();
        expect(text()).not.toContain('image: nginx:1.27');
    });

    test('names the box of the document for the assistive technology', () => {
        create();
        fixture.componentRef.setInput('ariaLabel', 'Final Compose file');
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelector('[role="region"]')?.getAttribute('aria-label'))
            .toBe('Final Compose file');
    });

    test('hides the buttons while the text loads, and when the document holds no text', () => {
        create(null);

        expect(button('yaml-viewer-copy')).toBeNull();
        expect(button('yaml-viewer-download')).toBeNull();

        fixture.componentRef.setInput('text', TEXT);
        fixture.componentRef.setInput('loading', true);
        fixture.detectChanges();

        expect(button('yaml-viewer-copy')).toBeNull();
        expect(button('yaml-viewer-download')).toBeNull();
    });

    test('copies the whole document to the clipboard, and confirms it', async () => {
        create();

        button('yaml-viewer-copy')?.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(writeText).toHaveBeenCalledWith(TEXT);
        expect(button('yaml-viewer-copy')?.getAttribute('aria-label')).toBe('Copied');
    });

    test('keeps the viewer working when the clipboard refuses the access', async () => {
        writeText.mockRejectedValue(new Error('denied'));
        create();

        button('yaml-viewer-copy')?.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(button('yaml-viewer-copy')?.getAttribute('aria-label')).toBe('Copy the document');
    });

    test('hands the document to the browser as a file that carries the name of the caller', () => {
        create();
        fixture.componentRef.setInput('fileName', 'docker-compose.yml');
        fixture.detectChanges();

        let link: HTMLAnchorElement | null = null;
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            .mockImplementation(function (this: HTMLAnchorElement): void { link = this; });

        button('yaml-viewer-download')?.click();

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(click).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:the-document');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(link!.download).toBe('docker-compose.yml');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(link!.href).toContain('blob:the-document');
    });
});
