# The JSDoc comment of a backend file

All the classes, the functions and the interfaces must have a JSDoc comment block.

## Domain

### Models

- One line that gives the purpose of the model in a short form.

### Constants

- One line that gives the purpose of the model in a short form.

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

## Infrastructure

### Repositories

- One line indicating that it is an implementation of the repository but using a specific technology.
- None of the public methods will have comments, since the interface already includes them.
- If it has private methods, each method must have its own JSDoc block with one line that gives the purpose of the method. 
- If the private method accepts parameters, write them with `@param parameterName Purpose`. 
- If the private method returns data, write the data with `@returns Returned data`.

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

### Modules

- One line with the text `<feature> feature module.`