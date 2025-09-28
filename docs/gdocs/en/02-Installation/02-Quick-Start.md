# Quick Start (For Developers)

This section is designed for developers who want to quickly set up and run AfiLite. If you are looking for a detailed, step-by-step guide, please refer to the [Step-by-Step Installation](./03-Step-by-Step-Installation.md) section.

## Prerequisites

Before starting the installation, make sure you meet the following requirements:

-   [Node.js (v18.x or higher)](./01-Requirements.md#nodejs)
-   [Git](./01-Requirements.md#git)
-   [Text Editor / IDE](./01-Requirements.md#text-editor--ide)

## Installation Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/AfiLite.git
    cd AfiLite
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    cd Ui
    npm install
    cd ..
    ```

3.  **Configure Environment Variables:**
    *   In the root directory of the project, copy the `example.env` file to `.env` using the `cp example.env .env` command.
    *   Open the `.env` file and update necessary variables like `JWT_SECRET` with your own values. See the [Environment Variables](./01-Requirements.md#environment-variables) section for details.

4.  **Prepare the Database:**
    ```bash
    npm run db:migrate
    npm run db:seed
    ```
    These commands will create the database schema and add initial data (e.g., an admin user).

5.  **Start the Application:**
    *   **Start the Backend:**
        ```bash
        npm run dev
        ```
        The backend server will run on `http://localhost:5003` by default.

    *   **Start the Frontend:**
        ```bash
        cd Ui
        npm run dev
        ```
        The frontend application will run on `http://localhost:4000` by default.

## First Run and Test

After starting the applications:

1.  Go to `http://localhost:4000` in your browser.
2.  You can access the Admin panel at `http://localhost:4000/admin/login`.
    *   **Default Admin Credentials:** `admin@afi.com` / `123456`
3.  You can access the Influencer panel at `http://localhost:4000/login`.
    *   **Default Influencer Credentials:** `inf1@test.com` / `123456` (Code: `TESTQUFDLE`)

You are now ready to use the AfiLite system! If you encounter any issues, please refer to the troubleshooting tips in the [Contribution Guide](./04-Development/01-Contribution-Guide.md) or open a GitHub Issue.
