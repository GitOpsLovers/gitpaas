import { reloadPage } from './reload-page';

describe('reloadPage', () => {
    test('loads the page of the document again', () => {
        const reload = vi.fn();
        const document = { location: { reload } } as unknown as Document;

        reloadPage(document);

        expect(reload).toHaveBeenCalledTimes(1);
    });
});
