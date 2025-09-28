# Architecture

AfiLite features a modular architecture designed with flexibility and scalability in mind. The project has both a headful interface that can operate as a standalone application and a headless API structure that can be easily integrated into existing systems.

## Overview

-   **Dual-Mode Structure (Headful and Headless):** AfiLite is designed to adapt to different usage scenarios. Whether you want to start quickly with a ready-made interface or integrate your own interface via the API.
-   **Layered Architecture:** The application has a layered structure with clear separation of responsibilities: Presentation (Frontend), Business Logic (Backend API), and Data Access (Database).
-   **API-Driven Development:** All business logic and data access are provided via RESTful APIs. This allows the frontend to be developed independently of the backend.

## Headful Solution

AfiLite comes with a ready-to-use user interface (UI) so that even non-technical users can easily set up and manage the system. This interface is developed using Next.js and Tailwind CSS and includes the following main panels:

-   **Admin Panel:** A central interface where system administrators manage influencers, codes, sales, payments, and general system settings.
-   **Influencer Panel:** A personal area where influencers create their own codes, track their performance, view their earnings, and review their payment history.

This headful solution is ideal for those who want to get started quickly and avoid additional development costs.

## Headless Solution

At the heart of AfiLite is a powerful and well-documented RESTful API. This API offers developers the freedom to connect their own custom interfaces or existing applications to AfiLite's backend. Advantages of the headless architecture:

-   **Flexibility:** Freedom to choose your own frontend technology (React, Vue, Angular, mobile applications, etc.).
-   **Customizability:** Ability to create fully customized user experiences according to the needs of your brand or project.
-   **Ease of Integration:** Seamless integration with existing e-commerce platforms, CRM systems, or other business applications.

## Database Structure

AfiLite uses SQLite for data storage. The database schema includes core entities such as influencers, discount codes, sales, payments, and system settings. Knex.js abstracts database interactions, providing secure and easy query building.

-   **Influencers:** User information, contact details, status, and role information.
-   **Discount Codes:** Codes created specifically for influencers, including discount and commission rates.
-   **Sales:** Details of sales made through codes, including amount and commission information.
-   **Payments:** Records of payments made to influencers.
-   **Contracts:** Versions and content of contracts made with influencers.

## Security Layer

AfiLite follows security best practices:

-   **JWT Authentication:** JSON Web Tokens are used for API access.
-   **Role-Based Authorization:** Privileges are defined for Admin and Influencer roles.
-   **Input Validation:** All API inputs are validated against potential vulnerabilities.
-   **Rate Limiting:** API request rates are limited to protect the server from overload.

This architecture makes AfiLite both a powerful and manageable platform.
