import mongoose from 'mongoose';

export const idLookup = (value) => mongoose.Types.ObjectId.isValid(value)
  ? { $or: [{ id: value }, { _id: value }] }
  : { id: value };
