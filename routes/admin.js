import express from 'express'
import { ContactModel, Courses, Lecture,User } from '../model/table.js';
import { isAdmin, isAuth } from '../middleware/isAuth.js';
import { uploadfiles } from '../middleware/multer.js';
import { rm } from 'fs'
import { promisify } from 'util'
import fs from 'fs'

const adminRouter = express.Router();

adminRouter.post('/course/new', isAuth, isAdmin, uploadfiles, async (req, res) => {

  try {
    const { title, discription, category, createdBy, duration, price } = req.body;
    const image = req.file

    await Courses.create({
      title,
      discription,
      category,
      createdBy,
      image: image?.path,
      duration,
      price
    })
    res.status(200).json({
      message: "Course Created Success",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }

})


adminRouter.post('/course/:id', isAuth, isAdmin, uploadfiles, async (req, res) => {
  try {
    const course = await Courses.findById(req.params.id)

    if (!course) {
      return res.status(404).json({
        message: "NO Course with this id"
      })
    }

    const { title, discription } = req.body
    const file = req.file
    const lecture = await Lecture.create({
      title,
      discription,
      video: file?.path,
      course: course._id,
    })

    res.status(201).json({
      message: "Leacture Added",
      lecture
    })
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
})

adminRouter.delete('/lecture/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
    rm(lecture.video,()=>{
      console.log("Video Deleted")
    })

    await lecture.deleteOne()

    res.json({
      message: "Lecture Deleted"
    })
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
})



const unlinkAsync = promisify(fs.unlink);

adminRouter.delete('/course/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const course = await Courses.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ✅ Delete lectures videos safely
    const lectures = await Lecture.find({ course: course._id });

    await Promise.all(
      lectures.map(async (lec) => {
        if (lec.video) {
          await unlinkAsync(lec.video);
        }
      })
    );

    // ✅ Delete course image safely
    if (course.image) {
      await fs.promises.rm(course.image);
    }

    // ✅ Delete lectures from DB
    await Lecture.deleteMany({ course: course._id });

    // ✅ Delete course
    await course.deleteOne();

    // ✅ Remove course from user subscriptions
    await User.updateMany(
      {},
      { $pull: { subscription: req.params.id } }
    );

    res.json({ message: "Course Deleted Successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});


// total 

adminRouter.get('/stats', isAuth, isAdmin, async (req, res) => {
  try {
    const totalCourse = (await Courses.find()).length;
    const totalLecture = (await Lecture.find()).length;
    const totalUser = (await User.find()).length;

    const stats ={
      totalCourse,
      totalLecture,
      totalUser,
    }
     res.json({
      stats,
     })
  } catch (error) {
     res.status(500).json({
      message: error.message,
    });
  }
})

// all user

adminRouter.get('/users', isAuth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({_id:{$ne : req.user._id}}).select("-password")
    res.json({users})
  } catch (error) {
     res.status(500).json({
      message: error.message,
    });
  }
})



// update role 

adminRouter.put('/user/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (user.userType === 'user') {
      user.userType = 'admin';
      await user.save();

      return res.status(200).json({
        message :"Role update to Admin"
      })
    }

if (user.userType === 'admin') {
      user.userType = 'user';
      await user.save();

      return res.status(200).json({
        message :"Role update to User"
      })
    }

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
})






// contact


adminRouter.get("/contacts", isAuth, isAdmin, async (req, res) => {
  try {
    const contacts = await ContactModel.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      contacts,
    });
  } catch (error) {
    console.log("CONTACT ERROR 👉", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

adminRouter.delete("/contact/:id", isAuth, isAdmin, async (req, res) => {
  try {
    const contact = await ContactModel.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    await contact.deleteOne();

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default adminRouter;