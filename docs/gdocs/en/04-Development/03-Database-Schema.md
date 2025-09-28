# Development: Database Schema

AfiLite uses SQLite for data storage and has a database schema managed with Knex.js. This section details the project's core tables, columns, and their relationships.

## Database Design Philosophy

The database design is built upon principles of simplicity, performance, and flexibility. Data consistency is ensured through a relational structure, while unnecessary complexity is avoided. All date/time information is stored in `YYYY-MM-DD HH:MM:SS` format.

## Core Tables

### 1. `influencers` Table

Stores basic information for influencers and admin users.

| Column Name | Data Type | Constraints | Description |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique Influencer/Admin ID |
| `full_name` | `TEXT` | `NOT NULL` | Full name of the influencer |
| `tax_type` | `TEXT` | `NOT NULL`, `ENUM('individual', 'company')` | Tax liability type |
| `phone` | `TEXT` | `NOT NULL` | Phone number |
| `email` | `TEXT` | `NOT NULL`, `UNIQUE` | Email address (unique) |
| `social_media` | `TEXT` | `NULLABLE` | Social media links (as JSON string) |
| `about` | `TEXT` | `NULLABLE` | Short description about the influencer |
| `message` | `TEXT` | `NULLABLE` | Message from the influencer |
| `status` | `TEXT` | `DEFAULT 'pending'`, `ENUM('pending', 'approved', 'rejected', 'suspended')` | Application/Account status |
| `followers` | `INTEGER` | `DEFAULT 0` | Follower count |
| `password_hash` | `TEXT` | `NULLABLE` | Hashed password |
| `role` | `TEXT` | `DEFAULT 'influencer'`, `ENUM('admin', 'influencer')` | User role |
| `brand_name` | `TEXT` | `NULLABLE` | Influencer's brand name |
| `notes` | `TEXT` | `NULLABLE` | Admin notes |
| `password_reset_token` | `TEXT` | `NULLABLE` | Password reset token |
| `password_reset_expires_at` | `DATETIME` | `NULLABLE` | Expiration time of the password reset token |
| `terms_accepted` | `BOOLEAN` | `DEFAULT FALSE` | Are terms and conditions accepted? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last update timestamp |

### 2. `discount_codes` Table

Stores discount codes specific to influencers.

| Column Name | Data Type | Constraints | Description |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique Code ID |
| `influencer_id` | `INTEGER` | `NOT NULL`, `FOREIGN KEY (influencers.id)` | ID of the Influencer who created the code |
| `code` | `TEXT` | `NOT NULL`, `UNIQUE` | Discount code (unique) |
| `discount_pct` | `INTEGER` | `NOT NULL`, `CHECK (1-100)` | Discount percentage applied to the customer |
| `commission_pct` | `INTEGER` | `NOT NULL`, `CHECK (1-100)` | Commission percentage paid to the influencer |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Is the code active? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |

### 3. `sales` Table

Stores sales made through discount codes.

| Column Name | Data Type | Constraints | Description |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique Sale ID |
| `code` | `TEXT` | `NOT NULL`, `FOREIGN KEY (discount_codes.code)` | Discount code used |
| `total_amount` | `REAL` | `NOT NULL` | Total amount of the sale |
| `commission` | `REAL` | `NOT NULL` | Commission amount paid to the influencer |
| `customer_url` | `TEXT` | `NULLABLE` | URL the customer was directed to |
| `product` | `TEXT` | `NULLABLE` | Name of the product sold |
| `note` | `TEXT` | `NULLABLE` | Notes related to the sale |
| `recorded_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Date/time the sale was recorded |

### 4. `payouts` Table

Stores payments made to influencers.

| Column Name | Data Type | Constraints | Description |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique Payout ID |
| `influencer_id` | `INTEGER` | `NOT NULL`, `FOREIGN KEY (influencers.id)` | ID of the Influencer to whom the payout was made |
| `amount` | `REAL` | `NOT NULL` | Payout amount |
| `status` | `TEXT` | `NOT NULL`, `ENUM('pending', 'completed', 'cancelled')` | Payout status |
| `iban` | `TEXT` | `NULLABLE` | IBAN to which the payout was made |
| `note` | `NULLABLE` | Notes related to the payout |
| `balance_before` | `REAL` | `NULLABLE` | Balance before payout |
| `balance_after` | `REAL` | `NULLABLE` | Balance after payout |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last update timestamp |

### 5. `contracts` Table

Stores versions of contracts made with influencers.

| Column Name | Data Type | Constraints | Description |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique Contract ID |
| `content` | `TEXT` | `NOT NULL` | Contract content (Markdown or plain text) |
| `version` | `INTEGER` | `NOT NULL`, `UNIQUE` | Contract version number |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT FALSE` | Is the contract active? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last update timestamp |

### 6. `influencer_social_accounts` Table

Stores social media accounts of influencers.

| Column Name | Data Type | Constraints | Description |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique ID |
| `influencer_id` | `INTEGER` | `NOT NULL`, `FOREIGN KEY (influencers.id)` | Influencer ID |
| `platform` | `TEXT` | `NOT NULL` | Social media platform (Instagram, YouTube, etc.) |
| `username` | `TEXT` | `NOT NULL` | Username/channel name |
| `address` | `TEXT` | `NULLABLE` | Profile link |
| `niche` | `TEXT` | `NULLABLE` | Influencer's niche |
| `role` | `TEXT` | `NULLABLE` | Influencer's role on the platform |
| `followers` | `INTEGER` | `DEFAULT 0` | Follower count |
| `avgViews` | `INTEGER` | `DEFAULT 0` | Average view count |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Is the account active? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last update timestamp |

### 7. `influencer_payment_accounts` Table

Stores payment accounts of influencers.

| Column Name | Data Type | Constraints | Description |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique ID |
| `influencer_id` | `INTEGER` | `NOT NULL`, `FOREIGN KEY (influencers.id)` | Influencer ID |
| `bank_name` | `TEXT` | `NOT NULL` | Bank name |
| `account_holder_name` | `TEXT` | `NOT NULL` | Account holder name |
| `iban` | `TEXT` | `NOT NULL` | IBAN number |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Is the account active? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last update timestamp |

This schema is designed to meet all the core data needs of the AfiLite platform. It can be easily managed and extended through Knex.js migration files.
