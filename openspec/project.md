# Project Documentation

## Overview
mtranscribe is a live transcription web application for multi-party conversations.

## Coding Standards

### Backend (Go)
- Follow the official Go style guide and effective Go practices
- Use `gofmt` for code formatting
- Use `golint` and `go vet` for static analysis
- Write idiomatic Go code with proper error handling
- Keep functions small and focused
- Use meaningful variable and function names

### Frontend (Vue/TypeScript)
- Follow Vue 3 composition API best practices
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Use meaningful component and variable names
- Keep components focused on a single responsibility
- Follow Tailwind CSS utility-first approach

## Documentation

### Code Documentation
- Document all public APIs and exported functions
- Use JSDoc comments for TypeScript/JavaScript
- Use Go doc comments for Go code
- Include usage examples where appropriate

### Project Documentation
- Keep README.md up to date with setup instructions
- Document architecture decisions in openspec/
- Maintain API documentation for backend endpoints
- Document component usage for frontend components

## Testing

### Backend Testing
- Write unit tests for all business logic
- Use Go's built-in testing framework
- Aim for meaningful test coverage
- Write integration tests for API endpoints

### Frontend Testing
- Write unit tests for utility functions
- Write component tests for Vue components
- Use Vitest or similar testing framework
- Test user interactions and state management

## Development Process

### Version Control
- Use feature branches for development
- Write clear, descriptive commit messages
- Keep commits focused and atomic
- Review code before merging

### Build and Deploy
- Ensure code builds without errors
- Run tests before committing
- Use CI/CD for automated testing and deployment

### Code Review
- All code changes should be reviewed
- Address review comments promptly
- Ensure tests pass before merging
