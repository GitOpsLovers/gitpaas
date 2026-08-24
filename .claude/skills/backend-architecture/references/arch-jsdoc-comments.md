# The JSDoc comment of a backend file

All the classes, the functions and the interfaces must have a JSDoc comment block. The conventions are:

- **Models**: one line that gives the purpose of the model in a short form.
- **Ports**: one line that gives the purpose of the port in a short form. Each method of the port must have its own JSDoc block with one line that gives the purpose of the method. If the method accepts parameters, write them with `@param parameterName Purpose`. If the method returns data, write the data with `@returns Returned data`.
- **Repositories**: one line that gives the purpose of the repository in a short form. Each method of the repository must have its own JSDoc block with one line that gives the purpose of the method. If the method accepts parameters, write them with `@param parameterName Purpose`. If the method returns data, write the data with `@returns Returned data`.
- **Use cases**: one line that gives the purpose of the use case in a short form. If the function accepts parameters, write them with `@param parameterName Purpose`. If the function returns data, write the data with `@returns Returned data`.
