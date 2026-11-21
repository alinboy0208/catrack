# Tạp Hóa Thúy — Neighborhood Convenience Store & Online Ordering

- **Customer Storefront:** [taphoathuy.vercel.app](https://taphoathuy.vercel.app/)
- **Admin Dashboard:** [taphoathuy.vercel.app/admin](https://taphoathuy.vercel.app/admin) *(PIN-protected)*

A full-stack web application and online ordering storefront built for **Tạp Hóa Thúy** (119 Ấp 5, Lê Văn Lương, Nhà Bè), enabling local residents to browse daily essentials, snacks, and beverages and place quick neighborhood delivery orders.

## Features

- **Customer Storefront (`/`):** Browse products by category (snacks, soft drinks, instant noodles, household essentials), search by keyword, and submit quick delivery orders on mobile or desktop.
- **Admin Dashboard (`/admin`):** PIN-authenticated management portal backed by Prisma to update product listings, manage stock availability, and track incoming customer orders.
- **Store Information & Contact:** Displays daily opening hours (06:30 – 22:30), store address directions, and direct ordering via Hotline/Zalo.

## Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Database & ORM:** Prisma
- **Deployment:** Vercel

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/alinboy0208/taphoathuy.git](https://github.com/alinboy0208/taphoathuy.git)
   cd taphoathuy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and configure your database connection string and admin PIN:
   ```env
   DATABASE_URL="your_database_connection_string"
   ```

4. **Generate Prisma client & run the development server:**
   ```bash
   npx prisma generate
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) for the customer storefront or [http://localhost:3000/admin](http://localhost:3000/admin) for the admin portal.

## Project Structure

```text
taphoathuy/
├── app/            # Next.js App Router pages (storefront & /admin) and API routes
├── lib/            # Prisma Client setup and utility helpers
├── prisma/         # Database schema and migrations
├── public/         # Static assets and store logo
└── middleware.ts   # PIN authentication and route protection for /admin
```
