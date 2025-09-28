# Development: Frontend Architecture

The frontend application of AfiLite is developed using Next.js and React, adhering to modern web development standards. This section details the frontend architecture, key components, data flow, and style management.

## 1. Overall Structure and Technologies

*   **Next.js (App Router):** The frontend uses Next.js's new App Router approach. This provides a more flexible separation between Server Components and Client Components, improves performance, and enhances the development experience.
*   **React:** The core library for building user interfaces.
*   **TypeScript:** Offers a type-safe development environment that improves code quality and readability, and facilitates error detection.
*   **Tailwind CSS:** A "utility-first" CSS framework for building fast and consistent interfaces. It allows us to define component styles directly within JSX.

## 2. Directory Structure (`Ui/app`)

The frontend application follows Next.js's recommended App Router directory structure:

*   **`app/`:** Contains all route-based components and layouts.
    *   **`layout.tsx`:** The main layout of the application. Includes global CSS, header, footer, and other elements common to all pages.
    *   **`page.tsx`:** The main UI component for a route.
    *   **`(protected)/`:** A folder used to group pages that require authentication. This folder does not affect the URL structure.
    *   **`admin/`:** Contains pages and components belonging to the admin panel.
    *   **`influencer/`:** Contains pages and components belonging to the influencer panel.
    *   **`api/`:** Contains Next.js API routes. Can act as a proxy to the backend API or contain direct server-side logic.
    *   **`_components/`:** Contains reusable UI components.
*   **`lib/`:** Contains utility functions, API services, and other general-purpose modules.
    *   **`api.ts`:** Contains functions that enable interaction with the backend API. Centralizes `fetch` calls and error handling.
    *   **`auth.ts`:** Contains utility functions related to authentication.
*   **`styles/`:** Contains global CSS files (e.g., `globals.css`).

## 3. Data Flow and API Interaction

The frontend application interacts with the backend through functions defined in `lib/api.ts`. These functions send requests to backend endpoints using the `fetch` API.

*   **Next.js Proxy:** Thanks to the `rewrites` rules defined in `next.config.js`, requests starting with `/api` are directly forwarded to the backend server. This prevents CORS issues and simplifies the development process.
*   **Client-Side Data Fetching:** Most data fetching operations occur on the client side within `useEffect` hooks or event handlers.

## 4. Style Management

The frontend uses Tailwind CSS to manage the interface style. The `globals.css` file contains Tailwind's base styles and custom global styles.

*   **Utility-First Approach:** Component styles are defined directly within JSX using Tailwind classes.
*   **`@tailwindcss/typography` (Prose):** The `prose` class is used to improve the readability of rich text content (like contract texts). This plugin automatically formats HTML content with beautiful typography.

## 5. Key Components and Patterns

*   **Client Components (`'use client'`):** Used for interactive UI logic, state management, and components requiring hooks like `useEffect`.
*   **Server Components (Default):** Used for data fetching and server-side logic. Improves performance and reduces bundle size.
*   **State Management:** Local component state is managed with React's `useState` and `useReducer` hooks. For global state management (if necessary), React Context API or third-party libraries can be used.

This architecture ensures that the AfiLite frontend is fast, maintainable, and extensible. Developers can contribute more effectively to the project by understanding this structure.
