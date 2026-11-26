import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: Date,
    renewals: { type: Number, default: 0 },
    lateFee: { type: Number, default: 0 },
    feePaid: { type: Boolean, default: false },
    status: { type: String, enum: ['issued', 'returned'], default: 'issued', index: true },
  },
  { timestamps: true }
);

export default mongoose.model('IssueRecord', issueSchema);