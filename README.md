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

The Salla API needs a secret key, so the app never talks to Salla directly. A small server will read products and stock from Salla and give the app a list in this shape (see `Product` in `src/data/catalog.ts`):

```json
{ "products": [{ "id": "123", "name": "…", "category": "edu", "age": "6+", "price": 159, "oldPrice": 199, "image": "https://…", "stock": 4, "url": "https://toys-lab.com/…" }] }
```

Set its address as `EXPO_PUBLIC_CATALOG_URL` and the app switches from the sample products to the real ones. Payment will move to the store's Salla checkout page so cards, Mada and Apple Pay work exactly as on the website.

Needed from the store owner: a private app in the Salla Partners portal, and its Client ID and Client Secret (shared privately, never committed here).

## Run locally

```bash
npm install
npx expo start
```
