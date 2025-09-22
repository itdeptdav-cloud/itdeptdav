
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Firebase Functions (Email verification)

This project includes a simple Cloud Function that sends verification codes via SendGrid when a document is added to `emailVerificationCodes`.

Quick setup:

```powershell
cd functions
npm install
# set sendgrid config (or use env vars)
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_KEY" sendgrid.sender="no-reply@yourdomain.com"
firebase deploy --only functions
```

See `functions/README.md` for more details.
