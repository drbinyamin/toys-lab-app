# Toys Lab app

Arabic shopping app for [Toys Lab](https://toys-lab.com/ar), a toy store in Jeddah. Built with Expo, so one codebase runs on iPhone and Android.

## What's in it

- **Home:** offer banners, quick links (fast delivery, gift wrapping, helium balloons, gift cards), shop by age, categories, and rows for offers, best sellers and new arrivals
- **Categories:** filter by category and age, search, sort
- **Gifts:** gift finder (who it's for, age, budget) and Toys Lab gift cards
- **Cart:** free-shipping progress bar, gift wrap with a message, balloons add-on, delivery or pick-up, payment choice, order sent to the store's WhatsApp
- **Account:** wallet, orders, favorites, delivery city, contact
- Light and dark mode

Products are **sample data** until the Salla store is connected (see below).

## Try it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. Open the project page on expo.dev (Projects → toys-lab → Updates), pick the latest update on the `main` branch and scan its QR code with the phone camera.

Every push to `main` publishes a new version automatically through `.github/workflows/publish.yml`. It needs one repository secret: `EXPO_TOKEN` (expo.dev → Account settings → Access tokens).

## Connecting the real stock (Salla)

The Salla API needs a secret key, so the app never talks to Salla directly. The server in `worker/` (Cloudflare Workers, free plan) does it:

- `POST /webhook`: Salla sends the store's access key here when the app is installed on the store (Easy Mode). Accepts both the Signature and Token webhook strategies.
- `GET /catalog`: the product list the app reads (real photos, prices, sale prices, stock, store links). Hidden and sold-out products are left out.
- `GET /`: status page (connected or not, last sync, product count).
- Every 10 minutes it renews the key when fewer than 3 days are left and re-reads the products in chunks (30 pages per run, to stay inside the free plan's limits).

Store categories and age groups are matched to the app's own by name (`worker/src/mapping.ts`).

It deploys automatically through `.github/workflows/deploy-api.yml` on changes under `worker/`. Repository secrets it needs: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SALLA_CLIENT_ID`, `SALLA_CLIENT_SECRET`, `SALLA_WEBHOOK_SECRET`. The deploy summary shows the webhook URL to paste into the Salla Partners portal.

After the first deploy, put the server address in `STORE.catalogUrl` (`src/data/catalog.ts`). Until the store is connected, the app shows sample products.

Tests: `cd worker && npm test` runs the whole flow against a simulated Salla.

## Run locally

```bash
npm install
npx expo start
```
