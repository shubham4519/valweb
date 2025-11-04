import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  filename: String,
  mimeType: String,
  size: Number,
  cloudUrl: String // uploaded location (optional)
});

const sentEmailSchema = new mongoose.Schema({
  uid: { type: Number, unique: true },
  from: String,
  to: String,
  subject: String,
  date: Date,
  textBody: String,
  htmlBody: String,
  attachments: [attachmentSchema]
},{
    timestamps: true
});

export default mongoose.model("SentEmail", sentEmailSchema);
