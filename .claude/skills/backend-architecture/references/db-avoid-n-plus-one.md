# Avoid a query per row

A loop that queries the database once for each row of a prior query is an N+1. Ask TypeORM for
the related rows in the same query, with the `relations` option of `find` and `findOne`.

```typescript
// features/projects/infrastructure/database/db-projects.repository.ts
public async getAll(namespaceId: string): Promise<Project[]> {
    const projects = await this.repository.find({
        where: { namespaceId },
        relations: { services: true },
        order: { id: 'DESC' },
    });

    return projects.map(toProject);
}
```

One `find` with `relations: { services: true }` returns every project and its services in one
round trip to PostgreSQL. Never fetch the projects first, then fetch the services of each project
inside a `for` loop or a `.map` with an `await`.
