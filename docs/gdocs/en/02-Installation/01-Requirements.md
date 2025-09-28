# Installation Requirements

To successfully install and run AfiLite, certain software must be installed on your system. This section details the pre-installation preparation steps and all necessary platforms.

## General Requirements

The following basic requirements apply to every installation scenario:

1.  **Node.js:** AfiLite's backend runs on Node.js. A version of Node.js **v18.x** or higher is recommended. `npm` (Node Package Manager) will be automatically installed along with Node.js.
    *   **Installation Check:** You can check the installed versions by running `node -v` and `npm -v` commands in your terminal.
    *   **Download:** If not installed, you can download the appropriate version for your operating system from the [official Node.js website](https://nodejs.org/).

2.  **Git:** Git is required to clone the project files from the GitHub repository.
    *   **Installation Check:** You can check the installed version by running the `git --version` command in your terminal.
    *   **Download:** If not installed, you can download the appropriate version for your operating system from the [official Git website](https://git-scm.com/downloads).

3.  **Text Editor / IDE:** A text editor or Integrated Development Environment (IDE) is recommended for viewing, editing, and working on the project. Popular options include:
    *   [Visual Studio Code](https://code.visualstudio.com/)
    *   [WebStorm](https://www.jetbrains.com/webstorm/)

## Database Requirements

AfiLite uses the **SQLite** database by default. Since SQLite is a serverless database, it does not require additional installation or configuration. The database file is automatically created and managed within the project directory.

*   **Additional Note:** If you wish to use a different database (e.g., PostgreSQL, MySQL), you will need to update the `knexfile.js` file and relevant dependencies (e.g., the `pg` package). However, this documentation will focus on the default SQLite setup.

## Environment Variables

AfiLite uses environment variables to manage sensitive information and configuration settings. You need to create an `.env` file in the root directory of the project and define the following variables:

*   You can copy the `example.env` file to create your `.env` file.

```dotenv
# Port on which the backend server will run
PORT=5003

# Secret key used to sign JWT (JSON Web Token). Must be a strong and random value.
JWT_SECRET="a-very-secret-key-goes-here-and-no-one-will-know"

# URLs where the frontend application runs. Required for CORS.
# Multiple URLs can be separated by commas. E.g.: http://localhost:3000,http://localhost:4000
CORS_ORIGINS="http://localhost:4000"

# Base URL that the frontend application will use to make requests to the backend API.
# Can usually be left empty or be the frontend's own URL if a Next.js proxy is used.
NEXT_PUBLIC_ADMIN_API_BASE_URL="http://localhost:5003"
NEXT_PUBLIC_INFLUENCER_API_BASE_URL="http://localhost:5003"

# Redis connection URL for development environment (optional, for rate limiting)
# REDIS_URL="redis://localhost:6379"

# Database path for test environment (optional)
# TEST_DB_PATH="./test.sqlite"

# Database path for production environment (optional)
# PRODUCTION_DB_PATH="./production.sqlite"
```

**Important Notes:**

*   The `JWT_SECRET` value must be kept strictly confidential, and a strong, randomly generated key should be used in a production environment.
*   The `CORS_ORIGINS` value must include the URLs where your frontend application runs. For security reasons, only allow trusted sources.

After meeting these requirements, you are ready to proceed with the AfiLite installation.
