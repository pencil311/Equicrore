import mongoose, { Schema, Model } from 'mongoose'

const UserDataSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, required: true, index: true },
  key:       { type: String, required: true },
  value:     { type: Schema.Types.Mixed, default: null },
  updatedAt: { type: Date, default: Date.now },
})

UserDataSchema.index({ userId: 1, key: 1 }, { unique: true })

UserDataSchema.pre('findOneAndUpdate', function () {
  this.set({ updatedAt: new Date() })
})

const UserData: Model<any> =
  mongoose.models.UserData || mongoose.model('UserData', UserDataSchema)

export default UserData
