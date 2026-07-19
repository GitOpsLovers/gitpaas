export const Octokit = jest.fn().mockImplementation(() => ({
    paginate: jest.fn().mockResolvedValue([]),
    request: jest.fn().mockResolvedValue({ data: {} }),
}));
