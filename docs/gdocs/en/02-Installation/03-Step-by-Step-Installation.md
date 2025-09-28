# Step-by-Step Installation

This section provides a detailed, step-by-step guide for anyone who wants to install AfiLite from scratch. The goal is for even users without programming knowledge to successfully complete the installation by following these steps.

## 1. Check Prerequisites

Before starting the installation, ensure that all necessary software is installed on your system. For detailed information, please refer to the [Installation Requirements](../01-Requirements.md) section.

-   **Node.js (v18.x or higher)**
-   **Git**
-   **Text Editor / IDE** (e.g., VS Code)

## 2. Download Project Files

Clone the project files from the GitHub repository to your computer. Open your terminal and run the following commands:

```bash
# Clone the repository
git clone https://github.com/your-username/AfiLite.git

# Navigate into the project directory
cd AfiLite
```

## 3. Install Dependencies

The AfiLite project has separate dependencies for both the backend and frontend. You need to install dependencies for both parts.

```bash
# Install backend dependencies
npm install

# Navigate to the frontend directory
cd Ui

# Install frontend dependencies
npm install

# Return to the project root directory
cd ..
```

## 4. Configure Environment Variables

AfiLite manages configuration settings and sensitive information via an `.env` file. You need to create this file and define the necessary variables.

1.  **Create the `.env` File:** In the root directory of the project (inside the `AfiLite` folder), there is a file named `example.env`. Copy this file to create a new file named `.env` (starting with a dot).
    ```bash
    cp example.env .env
    ```

2.  **Edit the `.env` File:** Open the `.env` file with a text editor (e.g., VS Code) and update the following variables according to your environment:

    *   `PORT`: The port number on which the backend server will run. Default is `5003`.
    *   `JWT_SECRET`: A secret key used to sign JWT (JSON Web Token). **This is very important!** Use a strong and random string of characters. For example, you can generate a random key with the `openssl rand -hex 32` command.
    *   `CORS_ORIGINS`: Specifies the URLs where your frontend application runs. If there are multiple URLs, separate them with commas (e.g., `http://localhost:3000,http://localhost:4000`). Default is `http://localhost:4000`.
    *   `NEXT_PUBLIC_ADMIN_API_BASE_URL` and `NEXT_PUBLIC_INFLUENCER_API_BASE_URL`: These are the base URLs that the frontend will use to make requests to the backend API. They are usually set to the backend server's address (e.g., `http://localhost:5003`).

    **Example `.env` content:**
    ```dotenv
    PORT=5003
    JWT_SECRET="your-very-secret-and-strong-key-goes-here"
    CORS_ORIGINS="http://localhost:4000"
    NEXT_PUBLIC_ADMIN_API_BASE_URL="http://localhost:5003"
    NEXT_PUBLIC_INFLUENCER_API_BASE_URL="http://localhost:5003"
    ```

## 5. Prepare the Database

Since AfiLite uses SQLite by default, you do not need to install an additional database server. You only need to create the database schema and load the initial data.

1.  **Create Database Schema (Migrations):**
    ```bash
    npm run db:migrate
    ```
    This command will run all migration files in the `src/db/migrations` folder to create the database tables.

2.  **Load Initial Data (Seeds):**
    ```bash
    npm run db:seed
    ```
    This command will run the seed files in the `src/db/seeds` folder to add an initial admin user and test influencer data to the database.

## 6. Start the Application

You are now ready to start both the backend and frontend applications.

1.  **Start the Backend Server:**
    Make sure you are in the project root directory and run the following command:
    ```bash
    npm run dev
    ```
    The backend server will start running at `http://localhost:5003`. You should see a message similar to `[backend] Server is listening on http://localhost:5003` in the terminal.

2.  **Start the Frontend Application:**
    Open a new terminal window, navigate to the `AfiLite/Ui` directory, and run the following command:
    ```bash
    cd Ui
    npm run dev
    ```
    The frontend application will start running at `http://localhost:4000`. You should see a message similar to `ready - started server on 0.0.0.0:4000, url: http://localhost:4000` in the terminal.

## 7. First Run and Test

After both applications are successfully running, you can test the system by accessing it from your browser:

1.  **Frontend Homepage:** Go to `http://localhost:4000` in your browser. You should see the Influencer application form.
2.  **Admin Panel Login:** Go to `http://localhost:4000/admin/login`.
    *   **Username:** `admin@afi.com`
    *   **Password:** `123456`
3.  **Influencer Panel Login:** Go to `http://localhost:4000/login`.
    *   **Username:** `inf1@test.com`
    *   **Password:** `123456`
    *   **Test Influencer Code:** `TESTQUFDLE`

Congratulations! You have successfully installed and run the AfiLite system. You can now start exploring the application.
