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


## Project Structure

```text
taphoathuy/
├── app/            # Next.js App Router pages (storefront & /admin) and API routes
├── lib/            # Prisma Client setup and utility helpers
├── prisma/         # Database schema and migrations
├── public/         # Static assets and store logo
└── middleware.ts   # PIN authentication and route protection for /admin
```
