const DAY = 24 * 60 * 60 * 1000;

export const daysLate = (dueDate, at = new Date()) =>
  Math.max(0, Math.ceil((new Date(at) - new Date(dueDate)) / DAY));

export const calcFee = (dueDate, at = new Date()) =>
  daysLate(dueDate, at) * (Number(process.env.FEE_PER_DAY) || 2);
