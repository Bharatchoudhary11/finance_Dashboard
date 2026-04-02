import bcrypt from 'bcryptjs';
import { Schema, model, type Document } from 'mongoose';
import type { UserStatus } from '../types/express';
import { ROLES, roleHierarchy, type Role } from '../types/roles';

export interface UserDocument extends Document {
  id: string;
  name: string;
  email: string;
  password: string;
  roles: Role[];
  status: UserStatus;
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    roles: {
      type: [String],
      enum: roleHierarchy,
      default: [ROLES.VIEWER],
      validate: {
        validator: function (value: string[]) {
          return value.length > 0 && value.every((role) => roleHierarchy.includes(role as Role));
        },
        message: 'Each user must have at least one valid role.',
      },
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

userSchema.pre<UserDocument>('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<UserDocument>('User', userSchema);
