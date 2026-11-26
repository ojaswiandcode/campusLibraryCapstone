import { Router } from 'express';
import User from '../models/User.js';
import IssueRecord from '../models/IssueRecord.js';
import { protect, authorize } from '../middleware/auth.js';

const r = Router();
r.use(protect, authorize('admin'));

r.get('/', async (req, res) => res.json(await User.find().select('-password').sort({ createdAt: -1 })));

r.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await User.create({ name, email, password, role });
  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

r.patch('/:id/role', async (req, res) => {
  if (String(req.user._id) === req.params.id)
    return res.status(400).json({ message: "You can't change your own role" });
  const user = await User.findByIdAndUpdate(
    req.params.id, { role: req.body.role }, { new: true, runValidators: true }
  ).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

r.delete('/:id', async (req, res) => {
  if (String(req.user._id) === req.params.id)
    return res.status(400).json({ message: "You can't delete yourself" });
  if (await IssueRecord.exists({ student: req.params.id, status: 'issued' }))
    return res.status(400).json({ message: 'User still has books issued' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

export default r;
