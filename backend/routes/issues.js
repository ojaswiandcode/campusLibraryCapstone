import { Router } from 'express';
import Book from '../models/Book.js';
import User from '../models/User.js';
import IssueRecord from '../models/IssueRecord.js';
import { protect, staff, authorize } from '../middleware/auth.js';
import { calcFee, daysLate } from '../utils/fee.js';

const r = Router();
r.use(protect);

const loanDays = () => Number(process.env.LOAN_DAYS) || 14;
const maxActive = () => Number(process.env.MAX_ACTIVE_ISSUES) || 3;
const renewDays = () => Number(process.env.RENEW_DAYS) || 7;
const maxRenewals = () => Number(process.env.MAX_RENEWALS) || 1;

// Shared issue logic: limits, atomic stock decrement, due date
async function issueBook(student, bookId, issuedBy) {
  const active = await IssueRecord.find({ student: student._id, status: 'issued' });
  if (active.length >= maxActive()) return { error: `Limit reached: ${maxActive()} books at a time` };
  if (active.some((a) => String(a.book) === String(bookId))) return { error: 'You already have this book' };
  const book = await Book.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } },
    { new: true }
  );
  if (!book) return { error: 'No copies available right now' };
  const record = await IssueRecord.create({
    book: book._id, student: student._id, issuedBy,
    dueDate: new Date(Date.now() + loanDays() * 864e5),
  });
  return { record, book };
}

// Student borrows a book themselves
r.post('/borrow', authorize('student'), async (req, res) => {
  const { error, record, book } = await issueBook(req.user, req.body.bookId, req.user._id);
  if (error) return res.status(400).json({ message: error });
  res.status(201).json({ ...record.toObject(), title: book.title });
});

// Librarian/admin issues a book to a student
r.post('/', staff, async (req, res) => {
  const student = await User.findOne({ email: req.body.studentEmail?.toLowerCase(), role: 'student' });
  if (!student) return res.status(404).json({ message: 'No student found with that email' });
  const { error, record } = await issueBook(student, req.body.bookId, req.user._id);
  if (error) return res.status(400).json({ message: error.replace('You already have', 'Student already has') });
  res.status(201).json(record);
});

// Return: students return their own books, staff can return any
r.post('/:id/return', async (req, res) => {
  const filter = { _id: req.params.id, status: 'issued' };
  if (req.user.role === 'student') filter.student = req.user._id;
  const record = await IssueRecord.findOneAndUpdate(
    filter, { status: 'returned', returnDate: new Date() }, { new: true }
  );
  if (!record) return res.status(404).json({ message: 'No active issue record found' });
  record.lateFee = calcFee(record.dueDate, record.returnDate);
  await record.save();
  await Book.findByIdAndUpdate(record.book, { $inc: { availableCopies: 1 } });
  res.json(record);
});

r.get('/my', async (req, res) => {
  const records = await IssueRecord.find({ student: req.user._id })
    .populate('book', 'title author category')
    .sort({ issueDate: -1 });
  res.json(records.map((rec) => {
    const issued = rec.status === 'issued';
    return {
      ...rec.toObject(),
      overdue: issued && daysLate(rec.dueDate) > 0,
      canRenew: issued && daysLate(rec.dueDate) === 0 && (rec.renewals || 0) < maxRenewals(),
      daysLate: issued ? daysLate(rec.dueDate) : daysLate(rec.dueDate, rec.returnDate),
      currentFee: issued ? calcFee(rec.dueDate) : rec.lateFee,
    };
  }));
});

r.get('/', staff, async (req, res) => {
  const q = req.query.status ? { status: req.query.status } : {};
  if (req.query.unpaid) Object.assign(q, { lateFee: { $gt: 0 }, feePaid: { $ne: true } });
  const records = await IssueRecord.find(q)
    .populate('book', 'title author').populate('student', 'name email')
    .sort({ issueDate: -1 }).limit(200);
  res.json(records.map((rec) => ({
    ...rec.toObject(),
    daysLate: rec.status === 'issued' ? daysLate(rec.dueDate) : 0,
    currentFee: rec.status === 'issued' ? calcFee(rec.dueDate) : rec.lateFee,
  })));
});

// Renew: extends the due date (only if not overdue, limited number of times)
r.post('/:id/renew', async (req, res) => {
  const filter = { _id: req.params.id, status: 'issued' };
  if (req.user.role === 'student') filter.student = req.user._id;
  const rec = await IssueRecord.findOne(filter);
  if (!rec) return res.status(404).json({ message: 'No active issue record found' });
  if (daysLate(rec.dueDate) > 0)
    return res.status(400).json({ message: 'Overdue books must be returned, not renewed' });
  if ((rec.renewals || 0) >= maxRenewals())
    return res.status(400).json({ message: 'This book has already been renewed the maximum number of times' });
  rec.dueDate = new Date(rec.dueDate.getTime() + renewDays() * 864e5);
  rec.renewals = (rec.renewals || 0) + 1;
  await rec.save();
  res.json(rec);
});

// Librarian marks a late fee as collected
r.post('/:id/pay', staff, async (req, res) => {
  const rec = await IssueRecord.findOneAndUpdate(
    { _id: req.params.id, status: 'returned', lateFee: { $gt: 0 }, feePaid: { $ne: true } },
    { feePaid: true },
    { new: true }
  );
  if (!rec) return res.status(404).json({ message: 'No unpaid fee on this record' });
  res.json(rec);
});

export default r;