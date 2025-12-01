
# How to Connect MySQL Backend (Step-by-Step)

Since Netlify only hosts the **Frontend** (the visual interface), you need to host the **Backend** (server.js) and the **Database** separately.

---

## Step 1: Host the MySQL Database

You can use a free cloud provider like **Railway** or **Aiven**, or a paid hosting provider like Hostinger (which you seem to be using).

**If using Hostinger/cPanel:**
1.  Log in to your hosting panel.
2.  Go to **MySQL Databases**.
3.  Create a new Database (e.g., `u148190840_spend`).
4.  Create a new User and assign it to the database with a password.
5.  Go to **phpMyAdmin**, select your database, click **SQL**, and paste the content of `schema.sql`. Click **Go**.
6.  **Important:** Ensure "Remote MySQL" is enabled for the IP address of your backend server (or allow `%` for all IPs for testing, though less secure).

---

## Step 2: Host the Backend (Node.js)

You can use **Render** (free tier available) or **Railway** to host the `server.js` file.

**Using Render.com:**
1.  Create a new repository on GitHub with just your backend files:
    *   `package.json`
    *   `server.js`
2.  Sign up at [render.com](https://render.com).
3.  Click **"New +"** -> **"Web Service"**.
4.  Connect your GitHub repository.
5.  **Build Command:** `npm install`
6.  **Start Command:** `node server.js`
7.  **Environment Variables:** Scroll down and click "Add Environment Variable". Add the following:
    *   `DB_HOST`: (Your Hostinger IP or `mysql.railway.internal`)
    *   `DB_USER`: `u148190840_spend`
    *   `DB_PASSWORD`: `G=rrdj^nc7`
    *   `DB_NAME`: `u148190840_spend`
    *   `PORT`: `3001` (or let Render assign one)
8.  Click **Deploy**.
9.  Once deployed, Render will give you a URL (e.g., `https://spendwise-backend.onrender.com`). Copy this.

---

## Step 3: Connect Frontend to Backend

Now we tell the Netlify app where to find the backend.

1.  Go to your **Netlify Dashboard**.
2.  Select your site (`SpendWise AI`).
3.  Go to **Site configuration** > **Environment variables**.
4.  Edit the variables:
    *   `VITE_USE_MOCK_DATA`: Set to `false`.
    *   `VITE_API_URL`: Paste your Render backend URL (e.g., `https://spendwise-backend.onrender.com/api`).
5.  Go to the **Deploys** tab and click **"Trigger deploy"** -> **"Clear cache and deploy site"**.

---

## Troubleshooting

*   **"Connection Refused":** This usually means your Database host (Hostinger) is blocking the connection from Render. Go to "Remote MySQL" in Hostinger and add the IP of your Render service (or `%` to test).
*   **"CORS Error":** The backend is running, but rejecting the frontend. In `server.js`, ensure `app.use(cors())` is present (it is included in the provided code).
