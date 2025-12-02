#  Job Application Tracker + Chrome Extension

A full-stack platform to track job applications with a powerful **Chrome Extension** that automatically scrapes job details from LinkedIn, Internshala, Unstop, etc., and adds them directly to your dashboard.

---

##  Features

### Frontend (Next.js 14 + TypeScript)
- Secure Login & Signup  
- Add, Edit, Delete job applications  
- Dashboard for all saved jobs  
- Protected routes using JWT  
- Responsive UI with TailwindCSS  
- Axios / Fetch API integration  


###  Backend (Node.js + Express + Prisma + MySQL)
- Authentication with JWT  
- Job CRUD operations  
- Prisma ORM schema + migration  
- Global API response handlers  
- Middleware-based route protection  

###  Chrome Extension (Manifest V3)
- Auto-detect job details on:
  - Unstop  
  - Internshala  
  - LinkedIn
- One-click “Save Job to Tracker”  
- Uses chrome.storage for JWT  
- Works on Chrome, Brave, Edge, Opera  

---

## Tech Stack

| Layer | Technology |
|------|------------|
| **Frontend** | Next.js 14, React, TypeScript, TailwindCSS |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | MySQL + Prisma ORM |
| **Auth** | JWT Authentication |
| **Extension** | Chrome Manifest V3 |
| **Others** | Axios, Fetch API |

---

### Frontend Environment Variables

The frontend uses environment variables to configure the application. Create a `.env` file inside the `frontend/` directory with the following variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```
To run it locally use these command
```
cd frontend
npm install
npm run dev
```


### Backend Environment Variables

The backend uses environment variables to configure the application. Create a `.env` file inside the `backend/` directory with the following variables:

```env
DATABASE_URL="mysql://<userID>:<password>@localhost:3306/jobtracker"
JWT_SECRET="your secret"
PORT=4000
CLIENT_URL=http://localhost:3000
```
To run it locally use these command
```
cd backend
npm install
npx prisma migrate
npx prisma generate
npm run dev
```

# Conclusion

This project integrates:

- ✔ Modern frontend with Next.js 
- ✔ Secure backend with JWT + Prisma
- ✔ Full CRUD job management
- ✔ A smart Chrome Extension for auto-saving jobs
- ✔ Scalable architecture

***A complete productivity tool for job seekers.***
