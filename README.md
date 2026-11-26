# CampusLibrary – Library Management System

MERN app. Librarians manage books and issue/return them, students see their issued books and dues, admins manage users.

## Setup

Needs Node 18+ and MongoDB running locally (or an Atlas URI).

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env      # edit MONGO_URI / JWT_SECRET if needed
npm run seed              # demo users, books, issue records
npm run dev               # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Demo logins (after seeding):

| Role      | Email                | Password   |
|-----------|----------------------|------------|
| Admin     | admin@campus.edu     | admin123   |
| Librarian | librarian@campus.edu | lib12345   |
| Student   | student@campus.edu   | student123 |

## Rules (change in `backend/.env`)
- Loan period `LOAN_DAYS=14`, late fee `FEE_PER_DAY=2` (₹ per day, rounded up), max `MAX_ACTIVE_ISSUES=3` books per student.
- Public signup creates students only. Admin creates librarians/admins from the Users page.

## API
| Method | Route | Who | What |
|---|---|---|---|
| POST | /api/auth/register, /login | public | signup (student) / login |
| GET | /api/auth/me | any | current user |
| GET | /api/books?search=&category=&page=&limit= | any | search + pagination |
| GET | /api/books/categories | any | category list |
| POST/PUT/DELETE | /api/books[/:id] | librarian, admin | book CRUD |
| POST | /api/issues | librarian, admin | issue `{studentEmail, bookId}`, sets due date, stock -1 |
| POST | /api/issues/:id/return | librarian, admin | return, late fee, stock +1 |
| GET | /api/issues/my | student | own records with dues |
| GET | /api/issues?status= | librarian, admin | all records |
| GET | /api/reports/most-borrowed | librarian, admin | aggregation: top books |
| GET | /api/reports/overdue | librarian, admin | aggregation: overdue list |
| GET/POST/PATCH/DELETE | /api/users | admin | user management |

## Structure
```
backend/   server.js, config/, models/ (User, Book, IssueRecord), middleware/auth.js, routes/, utils/fee.js, seed.js
frontend/  src/ (App, api.js, context/AuthContext, pages/: Login, Books, MyBooks, IssueReturn, Reports, Users)
```
