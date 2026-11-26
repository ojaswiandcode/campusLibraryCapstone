import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const r = Router();
const sign = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

// Public signup always creates a student. Staff accounts are created by an admin.
r.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Name, email and password are required' });
  const user = await User.create({ name, email, password, role: 'student' });
  res.status(201).json({ token: sign(user._id), user: pub(user) });
});

r.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user || !(await user.matchPassword(password || '')))
    return res.status(401).json({ message: 'Wrong email or password' });
  res.json({ token: sign(user._id), user: pub(user) });
});

r.get('/me', protect, (req, res) => res.json({ user: pub(req.user) }));

export default r;
