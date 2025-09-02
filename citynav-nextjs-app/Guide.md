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
- *Note* : Please create the new branch first and then make the necessary changes 

```bash
 git checkout -b your-branch-name
```

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

- After this push your work on the created branch 
```bash
git add .
git commit -m "What ever changes you made"
git push
```

## Problem I faced while pushing my work you can tackle it as follow if you have the same - 

- While pushing on the branch I created 
As the repo is remote so you might face this issue of pushing your branch and changes , to tackle this follow the following steps

If it shows below mentioned issue after pushing 
```
 git push 
fatal: The current branch version-2 has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin version-2

To have this happen automatically for branches without a tracking
upstream, see 'push.autoSetupRemote' in 'git help config'.
```

Do this
1. Run this command
```bash
git config --global push.autoSetupRemote true
```
As this command will automatically detect the newly created branch so you don't have to setup manually 

2. Now simply push 
```bash
git push
```

- Now after pushing this , i face issue in push as follow
```
$ git push
Enumerating objects: 29, done.
Counting objects: 100% (29/29), done.
Delta compression using up to 8 threads
Compressing objects: 100% (27/27), done.
Writing objects: 100% (28/28), 62.23 KiB | 1.89 MiB/s, done.
Total 28 (delta 1), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (1/1), completed with 1 local object.
remote: error: GH007: Your push would publish a private email address.
remote: You can make your email public or disable this protection by visiting:
remote: https://github.com/settings/emails
To https://github.com/xyz/CityNav.git
 ! [remote rejected] version-2 -> version-2 (push declined due to email privacy restrictions)
error: failed to push some refs to 'https://github.com/xyz/CityNav.git'
```

This error message means that you are trying to push commits to a GitHub repository, but the email address associated with those commits is set to private in your GitHub account. GitHub is rejecting the push to prevent your personal email from being made public in the commit history.

The error code GH007 is GitHub's way of enforcing a privacy setting that you have enabled. The solution is to update your local Git configuration to use a special, anonymous email address provided by GitHub.

How to Fix This
The Recommended Solution (Keep Your Email Private)
This is the best practice for maintaining your privacy. GitHub provides a "no-reply" email address for your account. You need to configure Git to use this address for your commits instead of your personal email.

- Find your GitHub no-reply email:

- Go to your GitHub Settings.

- Click on Emails in the left sidebar.

- Look for a checkbox labeled "Keep my email addresses private." Just below this, you will see a unique no-reply email address, formatted like `[ID]+[username]@users.noreply.github.com.` Copy this address.

- Update your Git configuration:

In your terminal, run the following command to set your global Git email to the no-reply address:
```bash
git config --global user.email "[ID]+[username]@users.noreply.github.com"
(Replace the bracketed values with your actual ID and username.)
```
- Amend your last commit (if needed):
If the failing commit is the most recent one, you can amend it to update the author's email with the new configuration. This will fix the commit that is causing the error.
```bash
git commit --amend --no-edit --reset-author
```

Try pushing again:
```bash
git push
```
This time, the push should be successful.

And next time whenever you make changes you can directly push the issue without all this hassel , this occurs if you are pushing first time 