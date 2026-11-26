import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Book from './models/Book.js';
import IssueRecord from './models/IssueRecord.js';

await mongoose.connect(process.env.MONGO_URI);
await Promise.all([User.deleteMany(), Book.deleteMany(), IssueRecord.deleteMany()]);

const [admin, lib, s1, s2] = await User.create([
  { name: 'Admin', email: 'admin@campus.edu', password: 'admin123', role: 'admin' },
  { name: 'Librarian', email: 'librarian@campus.edu', password: 'lib12345', role: 'librarian' },
  { name: 'Ojaswi Pandey', email: 'student@campus.edu', password: 'student123', role: 'student' },
  { name: 'Riya Sharma', email: 'riya@campus.edu', password: 'student123', role: 'student' },
]);

const mk = (title, author, category, totalCopies) => ({
  title, author, category, totalCopies, availableCopies: totalCopies,
});
const books = await Book.create([
  mk('Clean Code', 'Robert C. Martin', 'Programming', 3),
  mk('Introduction to Algorithms', 'Thomas H. Cormen', 'Computer Science', 2),
  mk('The Pragmatic Programmer', 'Andrew Hunt', 'Programming', 2),
  mk('Python for Data Analysis', 'Wes McKinney', 'Data Science', 3),
  mk('Hands-On Machine Learning', 'Aurelien Geron', 'Data Science', 2),
  mk('Designing Data-Intensive Applications', 'Martin Kleppmann', 'Computer Science', 1),
  mk('Eloquent JavaScript', 'Marijn Haverbeke', 'Programming', 4),
  mk('Wings of Fire', 'A.P.J. Abdul Kalam', 'Biography', 3),
  mk('The Discovery of India', 'Jawaharlal Nehru', 'History', 2),
  mk('Atomic Habits', 'James Clear', 'Self Help', 3),
]);

const day = 864e5, now = Date.now(), d = (n) => new Date(now + n * day);
await IssueRecord.create([
  { book: books[0]._id, student: s1._id, issuedBy: lib._id, issueDate: d(-20), dueDate: d(-6), status: 'issued' },
  { book: books[6]._id, student: s1._id, issuedBy: lib._id, issueDate: d(-3), dueDate: d(11), status: 'issued' },
  { book: books[0]._id, student: s2._id, issuedBy: lib._id, issueDate: d(-40), dueDate: d(-26), returnDate: d(-24), lateFee: 4, status: 'returned' },
  { book: books[3]._id, student: s2._id, issuedBy: lib._id, issueDate: d(-30), dueDate: d(-16), returnDate: d(-17), lateFee: 0, status: 'returned' },
  { book: books[0]._id, student: s1._id, issuedBy: lib._id, issueDate: d(-60), dueDate: d(-46), returnDate: d(-47), lateFee: 0, status: 'returned' },
  { book: books[3]._id, student: s1._id, issuedBy: lib._id, issueDate: d(-50), dueDate: d(-36), returnDate: d(-35), lateFee: 0, status: 'returned' },
  { book: books[9]._id, student: s2._id, issuedBy: lib._id, issueDate: d(-12), dueDate: d(2), status: 'issued' },
]);
// Keep stock consistent with the active issues above
for (const i of [0, 6, 9]) await Book.findByIdAndUpdate(books[i]._id, { $inc: { availableCopies: -1 } });

console.log('Seeded. Logins:\n  admin@campus.edu / admin123\n  librarian@campus.edu / lib12345\n  student@campus.edu / student123');
await mongoose.disconnect();
