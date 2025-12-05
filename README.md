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


###  Backend(Prisma + MySQL)
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
| **Backend** | Next.js, TypeScript |
| **Database** | MySQL + Prisma ORM |
| **Auth** | JWT Authentication |
| **Extension** | Chrome Manifest V3 |
| **Others** | Axios, Fetch API |

---

### Environment Variables

The app uses environment variables to configure the application. Create a `.env` file inside the `frontend/` directory with the following variables:

```env
DATABASE_URL="mysql://<userID>:<password>@localhost:3306/jobtracker"
JWT_SECRET="your secret"
CLIENT_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```
To run it locally use these command
```
cd application
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
