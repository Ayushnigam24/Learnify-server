import mongoose from "mongoose";
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  profile: { type: String },
  subscription: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Courses" }], default: [] },
  avatar: {
    url: {
      type: String,
      default: null,
    },
  },
  resetPasswordExpire: Date,
  userType: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now() },
  updatedAt: { type: Date, default: Date.now() },
})

export const User = mongoose.model('user', schema);


// course 

const courseSchema = new mongoose.Schema({
  title: { type: String },
  discription: { type: String },
  image: { type: String },
  price: { type: String },
  duration: { type: String },
  category: { type: String },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now() },
  updatedAt: { type: Date, default: Date.now() }
})

export const Courses = mongoose.model('course', courseSchema);



// lecture

const lectureSchema = new mongoose.Schema({
  title: { type: String },
  discription: { type: String },
  video: { type: String },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Courses' },
  createdAt: { type: Date, default: Date.now() },
  updatedAt: { type: Date, default: Date.now() }
})

export const Lecture = mongoose.model('lecture', lectureSchema);


// payment model 
const paymentSchema = new mongoose.Schema({
  razorpay_order_id: { type: String },
  razorpay_payment_id: { type: String },
  razorpay_signature: { type: String },
  createdAt: { type: Date, default: Date.now() },
  updatedAt: { type: Date, default: Date.now() }
})

export const Payment = mongoose.model('payment', paymentSchema);



// contact us 


const contactSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    mobile: String,
    subject: String,
    message: String,
  },
  { timestamps: true }
);

// 👇 yahi export use hoga
 export const ContactModel = mongoose.model("Contact", contactSchema);