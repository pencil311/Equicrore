import mongoose, { Schema, Document, Model } from 'mongoose'

const HoldingSchema = new Schema({
  sym:   String,
  name:  String,
  type:  String,
  qty:   Number,
  avg:   Number,
  price: Number,
  color: String,
}, { _id: false })

const WatchlistSchema = new Schema({
  sym:   String,
  name:  String,
  type:  String,
  price: Number,
  chg:   Number,
  color: String,
}, { _id: false })

const TransactionSchema = new Schema({
  type:  String,
  sym:   String,
  qty:   Number,
  price: Number,
  when:  String,
  date:  { type: Date, default: Date.now },
}, { _id: false })

export interface IPortfolio extends Document {
  userId:       mongoose.Types.ObjectId
  cash:         number
  holdings:     any[]
  watchlist:    any[]
  transactions: any[]
  updatedAt:    Date
}

const PortfolioSchema = new Schema<IPortfolio>({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  cash:         { type: Number, default: 10_000_000 },
  holdings:     [HoldingSchema],
  watchlist:    [WatchlistSchema],
  transactions: [TransactionSchema],
  updatedAt:    { type: Date, default: Date.now },
})

const Portfolio: Model<IPortfolio> = mongoose.models.Portfolio || mongoose.model<IPortfolio>('Portfolio', PortfolioSchema)
export default Portfolio
