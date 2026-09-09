# The JSDoc comment of a backend file

All the classes, the functions and the interfaces must have a JSDoc comment block.

## Domain

### Models

- One line that gives the purpose of the model in a short form.

### Constants

- One line that gives the purpose of the model in a short form.

### Errors

- One line that gives the purpose of the base error class, or of the error class, in a short form.
- The `code` field of a concrete error class needs no comment; the class comment already gives the reason it exists.

### DTOs

- One line that gives the purpose of the DTO in a short form, on the `interface` itself.
- A field needs no comment when its name already states its purpose.

### Ports

- One line that gives the purpose of the port in a short form. 
- Each method of the port must have its own JSDoc block with one line that gives the purpose of the method. 
- If the method accepts parameters, write them with `@param parameterName Purpose`. 
- If the method returns data, write the data with `@returns Returned data`.

### Repositories

- One line that gives the purpose of the repository in a short form. 
- Each method of the repository must have its own JSDoc block with one line that gives the purpose of the method. 
- If the method accepts parameters, write them with `@param parameterName Purpose`. 
- If the method returns data, write the data with `@returns Returned data`.

## Application

### Use cases

- One line that gives the purpose of the use case in a short form. 
- If the function accepts parameters, write them with `@param parameterName Purpose`. 
- If the function returns data, write the data with `@returns Returned data`.
- If the function throws errors, write them with `@throws {Error} Error explanation`. 

```typescript
/**
 * A single, brief line explaining the purpose of the use case
 *
 * @param parameterName Purpose
 *
 * @returns Returned data
 *
 * @throws {Error} Error explanation
 */
export function someUseCase
```

## Infrastructure

### Repositories

- One line indicating that it is an implementation of the repository but using a specific technology.
- None of the public methods will have comments, since the interface already includes them.
- If it has private methods, each method must have its own JSDoc block with one line that gives the purpose of the method. 
- If the private method accepts parameters, write them with `@param parameterName Purpose`. 
- If the private method returns data, write the data with `@returns Returned data`.

### Adapters

- One line that gives the purpose of the adapter in a short form.
- None of the public methods that implement a port need a comment; the port already carries it.
- A private method, and a module-level constant that the adapter alone uses, take their own one-line comment.

### Entities

- One line with the text `<Resource> database entity`, on the class.
- A column needs no comment when its name already states its purpose.

### Transformers

- One line that gives the purpose of the transformer in a short form. 
- If the function accepts parameters, write them with `@param parameterName Purpose`. 
- If the function returns data, write the data with `@returns Returned data`.

## UI

### Controllers*

- One line that gives the purpose of the controller in a short form.

### Services**

- One line that gives the purpose of the service in a short form. 
- Each method of the service must have its own JSDoc block with one line that gives the purpose of the method.

### Guards

- One line that gives the purpose of the guard in a short form.
- An overridden method of the base class takes its own JSDoc block with `@param` and `@returns`, as a use case does.

### Decorators

- One line that gives the purpose of the decorator, on the exported factory function or on the `createParamDecorator` call.

### Jobs

- One line with the text `<Purpose> job`, on the class.

### Middlewares

- One line that gives the purpose of the middleware in a short form.

### Pipes

- One line that gives the purpose of the pipe in a short form.
- The `transform` method takes its own JSDoc block, with `@param`, `@returns` and, when it throws, `@throws`.

### Filters

- One line that gives the purpose of the filter in a short form.
- A module-level constant that the filter alone uses takes its own one-line comment.

### Modules

- One line with the text `<feature> feature module.`