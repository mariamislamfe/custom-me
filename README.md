# Custom Me

A custom design store for art bags, laptop sleeves, T-ruler cases, notebooks and stickers — with a live design lab and a full admin dashboard.

**Live demo:** coming soon

## About

Custom Me is an online store for a small Egyptian brand that makes graphic, made-to-order pieces. Shoppers browse ready-made designs, or open any design in the Lab and make it their own: move, resize and recolour its parts, add their name or upload their own artwork, and see the result on the product before they order. The owner runs everything from one dashboard: products, product options, prices, delivery fees, payments, promo codes, orders and print-ready files.

## Tech stack

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=flat-square&logo=greensock&logoColor=black)
![Motion](https://img.shields.io/badge/Motion-FFF312?style=flat-square&logo=framer&logoColor=black)
![sharp](https://img.shields.io/badge/sharp-99CC00?style=flat-square&logo=sharp&logoColor=black)

## Key features

- **Design Lab** — drag, resize and rotate artwork and text right on the product, in any colour; the customer's original files are kept untouched for printing.
- **Editable shop designs** — designs uploaded as layers open in the Lab ready to change, so a customer can adapt an existing design instead of starting from scratch.
- **Sticker studio** — try stickers on a laptop, notebook, bottle or phone before ordering the whole set.
- **Admin dashboard** — products with automatic background removal, product options (sizes, pages, strap…), prices, delivery fees per governorate, promo codes and finance.
- **Print-ready orders** — every custom order comes with a mockup and a transparent print file with each layer at the exact size, place and angle.
- **Checkout** — cash on delivery or InstaPay (deposit or full payment with a discount), promo codes, and order tracking by order number or phone.
- **New-order alerts** — the dashboard installs on a phone and sends a push notification for every order.
- **Animated storefront** — scroll-driven sections for each product type, built to respect reduced-motion settings.

## Screenshot

![Custom Me storefront](docs/screenshot.png)

_Screenshot coming soon._

## Getting started

Requires Node.js 20 or later.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The store runs at http://localhost:3000 and the dashboard at http://localhost:3000/admin.

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | What it is |
| --- | --- |
| `ADMIN_PASSWORD` | Password for the dashboard |
| `ADMIN_SESSION_SECRET` | Optional extra secret for dashboard sessions and upload links |
| `SITE_URL` | The live domain, used in notification links |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |

Without the Supabase variables, everything is stored in a local `data/` folder — fine for development. For a live site, create a Supabase project, run `supabase/schema.sql` in its SQL editor, add the keys, then run `npm run supabase:setup` to create the storage buckets and copy any local data across.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Build and run for production |
| `npm run lint` | Lint the code |
| `npm run supabase:setup` | Create Supabase buckets and copy local data |
| `npm run icons` | Rebuild the dashboard app icons |

---

© Mariam Islam — All rights reserved. See [LICENSE](LICENSE).
