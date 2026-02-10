import express from 'express'
import { Courses, User, Lecture, Payment } from '../model/table.js';
import { isAuth } from '../middleware/isAuth.js';
import mongoose from 'mongoose';
import { instance } from '../index.js';
import crypto from 'crypto'
import { Progress } from '../model/Progress.js';

const courseRouter = express.Router();


// all course
courseRouter.get('/course/all', async (req, res) => {
    try {
        const courses = await Courses.find()
        res.status(200).json({
            success: true,
            courses,
        })
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
})

// find one course
courseRouter.get('/course/:id', async (req, res) => {
    const course = await Courses.findById(req.params.id)

    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found',
        })
    }

    res.status(200).json({
        success: true,
        course,
    })
})




// lecture get

courseRouter.get('/lectures/:id', isAuth, async (req, res) => {
    const lectures = await Lecture.find({ course: req.params.id })
    const user = await User.findById(req.user._id)

    if (user.userType === 'admin') {
        return res.json({ lectures })
    }
    if (!user.subscription.includes(req.params.id)) {
        return res.status(400).json({
            message: "you have not subscribled this course"
        })
    }
    res.json({ lectures })
})


// single lecture 
courseRouter.get('/lecture/:id', isAuth, async (req, res) => {
    try {

        const lecture = await Lecture.findById(req.params.id)
        const user = await User.findById(req.user._id)

        if (user.userType === 'admin') {
            return res.json({ lecture })
        }
        if (!user.subscription.includes(lecture.course)) {
            return res.status(400).json({
                message: "you have not subscribled this course"
            })
        }
        res.json({ lecture })

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
})


// get coures 

courseRouter.get('/myCourse', isAuth, async (req, res) => {
    try {
        const courses = await Courses.find({ _id: req.user.subscription })

        res.json({
            courses
        })
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
})


// payment 

courseRouter.post('/course/checkout/:id', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
        const course = await Courses.findById(req.params.id)

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        if (user.subscription.includes(course._id)) {
            return res.status(400).json({ message: "Already purchased" });
        }

        const order = await instance.orders.create({
            amount: course.price * 100,
            currency: "INR",
        });

        res.status(201).json({ order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})


courseRouter.post('/verification/:id', isAuth, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Payment failed" });
        }

        await Payment.create(req.body);

        const user = await User.findById(req.user._id);
        const course = await Courses.findById(req.params.id);

        user.subscription.push(course._id);


        // progress


        await Progress.create({
            course: course._id,
            completedLectures: [],
            user: req.user._id
        })

        await user.save();

        res.status(200).json({
            message: "Course Purchased Successfully",
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



// Add progress 

courseRouter.post('/user/progress', isAuth, async (req, res) => {

    try {
        const progress = await Progress.findOne({
            user: req.user._id,
            course: req.query.course,
        })

        const { lectureId } = req.query

        if (progress.completedLectures.includes(lectureId)) {
            return res.json({
                message: "Progress Recorded"
            })
        }

        progress.completedLectures.push(lectureId)

        await progress.save();

        res.status(201).json({
            message: "New progress added"
        })

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

// get parsentage 


courseRouter.get('/user/progress', isAuth, async (req, res) => {
    try {
        const progress = await Progress.find({
            user: req.user._id,
            course: req.query.course,
        })

if (!progress) {
    return res.status(404).json({
        message : "null"
    })
}

const allLectures = (await Lecture.find({course : req.query.course})).length;

const completedLectures = progress[0].completedLectures.length;

const courseProgressPercentage = (completedLectures * 100)/allLectures;

res.json({
    courseProgressPercentage,
    completedLectures,
    allLectures,
    progress
})

    } catch (error) {
         res.status(500).json({ message: error.message });
    }
})



export default courseRouter;