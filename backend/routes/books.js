import { Router } from 'express';
import Book from '../models/Book.js';
import IssueRecord from '../models/IssueRecord.js';
import { protect, staff } from '../middleware/auth.js';

const r = Router();
r.use(protect);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Search by title / author / category, filter by category, paginate
r.get('/', async (req, res) => {
  const { search, category } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 8));
  const q = {};
  if (search) {
    const re = new RegExp(escapeRegex(search.trim()), 'i');
    q.$or = [{ title: re }, { author: re }, { category: re }];
  }
  if (category) q.category = category;
  const [docs, total, mine] = await Promise.all([
    Book.find(q).sort({ title: 1 }).skip((page - 1) * limit).limit(limit),
    Book.countDocuments(q),
    req.user.role === 'student'
      ? IssueRecord.find({ student: req.user._id, status: 'issued' }).distinct('book')
      : [],
  ]);
  const have = new Set(mine.map(String));
  // `borrowed` = this student currently holds a copy
  const items = docs.map((b) => ({ ...b.toObject(), borrowed: have.has(String(b._id)) }));
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

r.get('/categories', async (req, res) => res.json(await Book.distinct('category')));

r.get('/:id', async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  res.json(book);
});

r.post('/', staff, async (req, res) => {
  const { title, author, category, isbn, totalCopies = 1 } = req.body;
  const book = await Book.create({
    title, author, category, isbn, totalCopies, availableCopies: totalCopies,
  });
  res.status(201).json(book);
});

r.put('/:id', staff, async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  const { title, author, category, isbn, totalCopies } = req.body;
  if (totalCopies !== undefined) {
    const out = book.totalCopies - book.availableCopies; // copies currently issued
    if (totalCopies < out)
      return res.status(400).json({ message: `${out} copies are issued, total can't go below that` });
    book.totalCopies = totalCopies;
    book.availableCopies = totalCopies - out;
  }
  Object.assign(book, { title, author, category, isbn });
  await book.save();
  res.json(book);
});

r.delete('/:id', staff, async (req, res) => {
  if (await IssueRecord.exists({ book: req.params.id, status: 'issued' }))
    return res.status(400).json({ message: 'Book has copies issued, return them first' });
  await Book.findByIdAndDelete(req.params.id);
  res.json({ message: 'Book deleted' });
});

export default r;