# Development: API Reference

AfiLite offers a comprehensive RESTful API to support both headful interfaces and headless integrations. This section details the core endpoints of our backend API, including request and response formats.

## API Basics

*   **Base URL:** `http://localhost:5003/api/v1` (For development environment)
*   **Authentication:** JWT (JSON Web Token) based authentication is required for most endpoints. The token should be sent in the `Authorization: Bearer <token>` header.
*   **Error Responses:** The API returns standard HTTP status codes for error conditions and responses in `json({ error: "Error message" })` format.

## Endpoints

### 1. Authentication (Auth)

*   **`POST /auth/admin/login`**
    *   **Description:** Logs in an admin user and returns a JWT token.
    *   **Request Body:** `{ email: string, password: string }`
    *   **Response:** `{ message: string, token: string, user: { id: number, email: string, role: string } }`

*   **`POST /auth/influencer/login`**
    *   **Description:** Logs in an influencer user and returns a JWT token.
    *   **Request Body:** `{ email: string, password: string }`
    *   **Response:** `{ message: string, token: string, user: { id: number, email: string, role: string, full_name: string } }`

*   **`GET /auth/verify`**
    *   **Description:** Checks the validity of the current JWT token.
    *   **Authentication:** Required
    *   **Response:** `{ valid: boolean, user: { id: number, email: string, role: string } }`

### 2. Influencer Management (Admin)

*   **`GET /influencers`**
    *   **Description:** Lists all influencers. Supports pagination, search, and sorting.
    *   **Authentication:** Admin required
    *   **Query Parameters:** `page`, `limit`, `search`, `start_date`, `end_date`, `sortBy`, `sortOrder`
    *   **Response:** `{ items: Influencer[], pagination: { total: number, page: number, limit: number, pages: number } }`

*   **`GET /influencers/:id`**
    *   **Description:** Retrieves details of a specific influencer.
    *   **Authentication:** Admin required
    *   **Response:** `Influencer` object

*   **`PATCH /influencers/:id`**
    *   **Description:** Updates an influencer's information.
    *   **Authentication:** Admin required
    *   **Request Body:** `{ full_name?: string, email?: string, brand_name?: string, status?: string, notes?: string }`
    *   **Response:** Updated `Influencer` object

### 3. Sales Management

*   **`POST /sale`**
    *   **Description:** Creates a new sales record. (Public endpoint)
    *   **Request Body:** `{ code: string, total_amount: number, customer_url?: string, product?: string, note?: string }`
    *   **Response:** `{ message: string, sale_id: number, sale: Sale }`

*   **`GET /sales`**
    *   **Description:** Lists all sales. Supports pagination and filtering.
    *   **Authentication:** Required (Admin or Influencer)
    *   **Query Parameters:** `page`, `limit`, `code`, `start_date`, `end_date`, `influencerId`
    *   **Response:** `{ items: Sale[], pagination: { total: number, page: number, limit: number, pages: number } }`

*   **`PATCH /sales/:id`**
    *   **Description:** Updates a sales record.
    *   **Authentication:** Admin required
    *   **Request Body:** `{ total_amount?: number, customer_url?: string, product?: string, note?: string }`
    *   **Response:** Updated `Sale` object

### 4. Code Management

*   **`POST /codes`**
    *   **Description:** Creates a new discount code.
    *   **Authentication:** Admin required
    *   **Request Body:** `{ influencer_id: number, code: string, discount_percentage: number, commission_pct: number }`
    *   **Response:** New `Code` object

*   **`GET /codes/influencer/:id`**
    *   **Description:** Lists all codes belonging to a specific influencer.
    *   **Authentication:** Admin required
    *   **Response:** `{ codes: Code[] }`

*   **`GET /codes/my`**
    *   **Description:** Lists all codes belonging to the logged-in influencer.
    *   **Authentication:** Influencer required
    *   **Response:** `{ items: Code[] }`

### 5. Payment Management

*   **`GET /payouts`**
    *   **Description:** Lists all payment records. Supports pagination and filtering.
    *   **Authentication:** Admin required
    *   **Query Parameters:** `page`, `limit`, `influencer_id`, `start_date`, `end_date`, `status`
    *   **Response:** `{ items: Payout[], pagination: { total: number, page: number, limit: number, pages: number } }`

*   **`POST /payouts`**
    *   **Description:** Creates a new payment record.
    *   **Authentication:** Admin required
    *   **Request Body:** `{ influencer_id: number, amount: number, iban: string, note?: string, status?: string }`
    *   **Response:** New `Payout` object

### 6. Contract Management

*   **`GET /contracts/active`**
    *   **Description:** Retrieves the active contract version.
    *   **Response:** `Contract` object

*   **`GET /contracts`**
    *   **Description:** Lists all contract versions.
    *   **Authentication:** Admin required
    *   **Response:** `Contract[]`

*   **`POST /contracts`**
    *   **Description:** Creates a new contract version and sets it as active.
    *   **Authentication:** Admin required
    *   **Request Body:** `{ content: string }`
    *   **Response:** New `Contract` object

This reference will guide you when integrating with the AfiLite API. For more details, you can examine the backend code.
