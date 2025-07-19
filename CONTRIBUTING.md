# Contributing to OmniOAST

Thank you for your interest in contributing to this project! We welcome contributions from the community to help improve and grow the project. Please follow the guidelines below to ensure a smooth contribution process.

## Getting Started

1. **Fork the Repository**: Start by forking the repository on GitHub.
2. **Clone the Repository**: Clone your forked repository to your local machine.
   ```bash
   git clone https://github.com/<YOU>/OmniOAST
   ```
3. **Install Dependencies**: Navigate to the project directory and install the dependencies using pnpm.
   ```bash
   pnpm install
   ```

## Development Setup

To set up your development environment and test your changes:

- **Type Check**: Run type checking to ensure there are no type errors.
  ```bash
  pnpm typecheck
  ```

- **Build the Package**: Build the project.
  ```bash
  pnpm build
  ```

- **Watch Mode**: For testing with Caido's `Devtools` Plugin, use watch mode to automatically rebuild on changes.
  ```bash
  pnpm watch

  # Connect to http://localhost:3000 in the Devtools tab of Caido.
  ```

## Branching Strategy

We follow a GitHub Flow branching strategy:

- The `main` branch is the primary branch and should always be in a deployable state.
- Create feature branches for new features (e.g., `feature/new-feature`).
- Create bugfix branches for fixes (e.g., `bugfix/fix-issue`).
- Work on your changes in these branches.
- Once ready, open a pull request to merge into `main`.

## Making Changes

1. **Create a Branch**: From the `main` branch, create a new branch for your work.
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**: Implement your feature or fix.

3. **Commit Your Changes**: Use clear, descriptive commit messages.
   ```bash
   git commit -m "Add your commit message here"
   ```

4. **Push to Your Fork**: Push the branch to your forked repository.
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**: Go to the original repository on GitHub and open a pull request from your branch to `main`. Provide a clear description of your changes and reference any related issues.

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub with as much detail as possible.

Thank you for contributing!
