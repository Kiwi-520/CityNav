This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Basic Installation process (Swatantra Kasliwal)
- Basic Installation command -

```bash
npx create-next-app@latest citynav-nextjs-app
```
- Select below mentioned dependencies 
```
√ Would you like to use TypeScript? Yes
√ Which linter would you like to use? » ESLint
√ Would you like to use Tailwind CSS? Yes
√ Would you like your code inside a `src/` directory? Yes
√ Would you like to use App Router? (recommended) Yes
√ Would you like to use Turbopack? (recommended) Yes
√ Would you like to customize the import alias (`@/*` by default)? No
```
- Your file structure will look like this 

```
/nextjs-app-migration
├── /app                  # This is the routing directory
│   ├── /about            # A route for your About page (e.g., /about)
│   │   └── page.tsx      # The actual component for the /about page
│   ├── /contact          # A route for your Contact page (e.g., /contact)
│   │   └── page.tsx      # The actual component for the /contact page
│   ├── layout.tsx        # The root layout for your entire app
│   └── page.tsx          # The home page for your app (e.g., /)
├── /components           # Your reusable components go here
│   ├── Header.tsx
│   └── Button.tsx
├── /public               # Static assets (images, fonts, etc.)
│   └── favicon.ico
├── next.config.mjs       # Next.js configuration file
├── package.json
├── tsconfig.json         # TypeScript configuration file
└── next-env.d.ts         # TypeScript declaration file for Next.js
```

- After successful completion run the following command to install the additional necessary dependencies

```bash
cd citynav-nextjs-app
npm install axios react-icons react-chartjs-2

```

- To run the app locally , use the following command 

```bash
npm run dev
```

Go to `http://localhost:3000` and test all your migrated pages.

