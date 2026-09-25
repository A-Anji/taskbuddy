# TaskBuddy

TaskBuddy is a full-stack task management application built for a college internship assignment. Each user can register, sign in, and manage only their own tasks.
Link: https://taskbuddy-bice.vercel.app/
## Features

- JWT-based registration, login, and logout
- User-owned task creation, listing, editing, deletion, and status updates
- Task priority, due date, and status tracking
- Dashboard statistics, task filters, loading states, empty states, and API error messages
- Responsive React dashboard for desktop and mobile layouts

## Technology stack

- Frontend: React, Vite, JavaScript, CSS
- Backend: Node.js, Express
- Database: MongoDB Atlas with Mongoose
- Authentication: JSON Web Tokens and bcryptjs

## Project structure

```text
taskbuddy/
├── src/                 # React dashboard
├── public/              # Static frontend assets
├── server/
│   ├── middleware/      # JWT middleware
│   ├── models/          # User and Task models
│   ├── routes/          # Authentication and task routes
│   └── server.js        # Express entry point
└── package.json         # Frontend scripts
```

## Local setup

Prerequisites: Node.js 18+ and a MongoDB Atlas cluster.

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Install backend dependencies:

   ```bash
   cd server
   npm install
   ```

3. Copy `server/.env.example` to `server/.env` and set your local values:

   ```env
   MONGO_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_long_random_secret
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```

4. Start the backend from `server/`:

   ```bash
   npm run dev
   ```

5. Start the frontend from the project root:

   ```bash
   npm run dev
   ```

The frontend uses `http://localhost:5000` by default. To point it at another backend, create a local frontend `.env` file with `VITE_API_URL=https://your-api.example`.

## MongoDB Atlas overview

Create a cluster, create a database user, allow your development IP address, and copy the application connection string into `MONGO_URI`. Keep that connection string private.

## API summary

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Register a user |
| POST | `/api/auth/login` | No | Log in and receive a JWT |
| GET | `/api/tasks` | Bearer JWT | List the current user's tasks |
| POST | `/api/tasks` | Bearer JWT | Create a task |
| PUT | `/api/tasks/:id` | Bearer JWT | Update an owned task |
| DELETE | `/api/tasks/:id` | Bearer JWT | Delete an owned task |

## Authentication

After login, the frontend keeps the JWT and returned user information in browser session storage. The backend verifies `Authorization: Bearer <token>` before task operations and scopes each task query to the authenticated user.

## Deployment notes

- Set `VITE_API_URL` to the public backend URL before building the frontend.
- Set `FRONTEND_URL` on the backend to the deployed frontend origin for CORS.
- Configure `MONGO_URI`, `JWT_SECRET`, and `PORT` in the backend hosting environment.
- Run `npm run build` in the project root and `npm start` in `server/`.

## Security

Never commit real `.env` files, database connection strings, JWT secrets, or passwords. The repository ignores environment files; commit only safe example files such as `server/.env.example`.
