
# Backend Setup Guide

## 1. Prerequisites
- Node.js installed
- MySQL Server installed and running

## 2. Install Dependencies
Run the following command in the root folder to install the required backend packages:
```bash
npm install express mysql2 cors body-parser
```

## 3. Database Setup
1. Open your MySQL client (Workbench, Command Line, etc.).
2. Copy the content of `schema.sql`.
3. Execute the SQL to create the `spendwise` database and tables.

## 4. Configure Connection
1. Open `server.js`.
2. Locate the `dbConfig` object at the top.
3. Update `user` and `password` to match your local MySQL credentials.

## 5. Run the Server
Start the backend server:
```bash
node server.js
```
The server will start on `http://localhost:3001`.

## 6. Frontend
The frontend `services/api.ts` has been updated to `USE_MOCK_DATA = false`.
Reload your React app. It will now connect to your local MySQL database!
