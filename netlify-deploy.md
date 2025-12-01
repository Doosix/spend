# Deploying SpendWise AI to Netlify

Follow these steps to deploy your application.

## 1. Push to GitHub
If you haven't already, push your code to a GitHub repository.

## 2. Connect to Netlify
1. Log in to [Netlify](https://app.netlify.com/).
2. Click **"Add new site"** -> **"Import from Git"**.
3. Select **GitHub** and choose your repository.

## 3. Configure Build Settings
Netlify should detect these automatically, but ensure they are correct:
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`

## 4. Set Environment Variables
The app needs your Gemini API key to function.
1. In the Netlify deploy setup (or later in Site Settings > Environment variables):
2. Click **"Add Environment Variable"**.
3. **Key:** `VITE_GOOGLE_API_KEY`
4. **Value:** *(Paste your Google Gemini API Key here)*

> **Note:** The Supabase connection details are currently pre-configured in `services/supabaseClient.ts`, so you don't need to add them here unless you change them in the code to use variables.

## 5. Deploy
Click **"Deploy Site"**.

## 6. Finish
Your site will be live in a few minutes!
