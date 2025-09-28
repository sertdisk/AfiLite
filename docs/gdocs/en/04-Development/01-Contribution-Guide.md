# Development: Contribution Guide

AfiLite is an open-source project that aims to grow stronger with community contributions. All kinds of contributions, such as bug fixes, new features, documentation improvements, or performance optimizations, are valuable. This guide explains step-by-step how you can contribute to the project.

## 1. Before Contributing

*   **Code of Conduct:** Please read the project's [Code of Conduct](CODE_OF_CONDUCT.md) and adhere to these rules in your contributions.
*   **Review Existing Issues:** If you have a topic you'd like to contribute to, first check the [GitHub Issues](https://github.com/your-username/AfiLite/issues) section. Perhaps the topic you want to work on has already been reported or discussed.
*   **New Feature Proposals:** If you want to add a new feature, first open an Issue and share your idea with the community. This prevents unnecessary work and helps us understand if the feature aligns with project goals.

## 2. Setting Up the Development Environment

To contribute to the project, you need to set up your development environment. Follow the [Step-by-Step Installation](../02-Installation/03-Step-by-Step-Installation.md) guide for detailed steps.

## 3. Contribution Process

1.  **Fork the Repository:** Fork the AfiLite repository to your own GitHub account.
2.  **Clone the Repository:** Clone your forked repository to your local machine:
    ```bash
    git clone https://github.com/your-username/AfiLite.git
    cd AfiLite
    ```
3.  **Create a New Branch:** For every change you make, create a new branch from the main branch (usually `main` or `master`). Branch names should reflect the change you are making (e.g., `feature/new-feature`, `bugfix/bug-name`).
    ```bash
    git checkout -b feature/new-feature
    ```
4.  **Make Your Changes:** Write your code, fix bugs, or develop new features.
5.  **Run Tests:** Run tests to ensure your changes do not break existing functionality and that new features work as expected.
    ```bash
    npm test
    ```
6.  **Check Code Style:** Run the linter to adhere to the project's code style rules and fix any errors.
    ```bash
    npm run lint:fix
    ```
7.  **Commit Your Changes:** Commit your changes with a descriptive message. Ensure your commit messages are clear and concise.
    ```bash
    git commit -m "feat: Added new feature" # or "fix: Fixed bug"
    ```
8.  **Push Your Changes:** Push your branch to your GitHub repository.
    ```bash
    git push origin feature/new-feature
    ```
9.  **Create a Pull Request:** Create a Pull Request to the AfiLite repository via GitHub. In your Pull Request:
    *   Clearly describe the changes you have made.
    *   Specify which problem it solves or which feature it adds.
    *   Reference relevant Issue numbers if any.

## 4. Code Review and Merging

Once your Pull Request is created, it will be reviewed by project maintainers or other community members. Be open to feedback and ready to make requested changes. Your code will be merged into the main branch after approval.

## 5. Thank You!

Thank you in advance for your contributions! We are grateful for your help in making AfiLite a better platform.
