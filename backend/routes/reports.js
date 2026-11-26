import { Router } from 'express';
import IssueRecord from '../models/IssueRecord.js';
import Book from '../models/Book.js';
import User from '../models/User.js';
import { protect, staff } from '../middleware/auth.js';

const r = Router();
r.use(protect, staff);

// Most-borrowed books (aggregation: group -> sort -> lookup)
r.get('/most-borrowed', async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const data = await IssueRecord.aggregate([
    { $group: { _id: '$book', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    {
      $project: {
        _id: 0,
        bookId: '$book._id',
        title: '$book.title',
        author: '$book.author',
        category: '$book.category',
        count: 1,
      },
    },
  ]);
  res.json(data);
});

// Overdue list (aggregation: match -> lookups -> computed days)
r.get('/overdue', async (req, res) => {
  const now = new Date();
  const perDay = Number(process.env.FEE_PER_DAY) || 2;
  const data = await IssueRecord.aggregate([
    { $match: { status: 'issued', dueDate: { $lt: now } } },
    { $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'book' } },
    { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'student' } },
    { $unwind: '$book' },
    { $unwind: '$student' },
    {
      $addFields: {
        daysOverdue: { $ceil: { $divide: [{ $subtract: [now, '$dueDate'] }, 864e5] } },
      },
    },
    { $addFields: { fee: { $multiply: ['$daysOverdue', perDay] } } },
    {
      $project: {
        title: '$book.title',
        studentName: '$student.name',
        studentEmail: '$student.email',
        dueDate: 1,
        daysOverdue: 1,
        fee: 1,
      },
    },
    { $sort: { daysOverdue: -1 } },
  ]);
  res.json(data);
});

// Headline numbers for the reports page
r.get('/summary', async (req, res) => {
  const [books, members, issued, overdue, fees] = await Promise.all([
    Book.aggregate([{ $group: { _id: null, titles: { $sum: 1 }, copies: { $sum: '$totalCopies' }, available: { $sum: '$availableCopies' } } }]),
    User.countDocuments({ role: 'student' }),
    IssueRecord.countDocuments({ status: 'issued' }),
    IssueRecord.countDocuments({ status: 'issued', dueDate: { $lt: new Date() } }),
    IssueRecord.aggregate([
      { $match: { status: 'returned' } },
      { $group: { _id: null,
          collected: { $sum: { $cond: [{ $eq: ['$feePaid', true] }, '$lateFee', 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$feePaid', true] }, 0, '$lateFee'] } } } },
    ]),
  ]);
  res.json({
    titles: books[0]?.titles || 0, copies: books[0]?.copies || 0, available: books[0]?.available || 0,
    members, issued, overdue, feesCollected: fees[0]?.collected || 0, feesPending: fees[0]?.pending || 0,
  });
});

// Books issued per month, last 6 months (zero-filled) for the bar chart
r.get('/monthly', async (req, res) => {
  const now = new Date();
  const months = [5, 4, 3, 2, 1, 0].map((i) => new Date(now.getFullYear(), now.getMonth() - i, 1));
  const rows = await IssueRecord.aggregate([
    { $match: { issueDate: { $gte: months[0] } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$issueDate' } }, count: { $sum: 1 } } },
  ]);
  const byKey = Object.fromEntries(rows.map((x) => [x._id, x.count]));
  res.json(months.map((d) => {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { month: key, label: d.toLocaleString('en-US', { month: 'short' }), count: byKey[key] || 0 };
  }));
});

// Borrowing by category
r.get('/by-category', async (req, res) => {
  res.json(await IssueRecord.aggregate([
    { $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'b' } },
    { $unwind: '$b' },
    { $group: { _id: '$b.category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, category: '$_id', count: 1 } },
  ]));
});

export default r;