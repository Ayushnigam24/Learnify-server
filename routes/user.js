import express from 'express';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import sendMail, { sendForgetMail } from '../middleware/sendMail.js';
import { ContactModel, User } from '../model/table.js';
import { isAuth } from '../middleware/isAuth.js';
import fs from "fs";
import { uploadfiles } from '../middleware/multer.js';
const router = express.Router();
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const isExist = await User.findOne({ email });
    if (isExist) {
      return res.status(400).json({
        message: "User already exist.",
      })
    }
    const hashPassword = await bcrypt.hash(password, 10)

    const user = {
      name,
      email,
      password: hashPassword
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    const activationToken = jwt.sign({
      user,
      otp,
    }, process.env.Activation_Secret, {
      expiresIn: "5m"
    })


    await sendMail(
      email,
      "Account Activation Otp",
      { name, otp }
    )
    res.status(200).json({
      message: "Otp send to your mail",
      activationToken
    })
  } catch (err) {
    console.error("register error", err);
    res.status(500).json({
      message: err.message,
    })
  }
})


// router.post('/verifyUser', async (req, res) => {

//     const verifyUser = async (req, res) => {
//         try {
//             const { otp, activationToken } = req.body

//             const verify = jwt.verify(activationToken, process.env.Activation_Secret)
//             if (!verify) {
//                 return res.status(400).json({
//                     message: "opt expired",
//                 })
//             }

//             if (verify.otp !== otp) {
//                 return res.status(400).json({
//                     message: "opt wrong",
//                 })
//             }
//             await User.create({
//                 name: verify.user.name,
//                 email: verify.user.email,
//                 password: verify.user.password,
//             })
//             res.json({
//                 message: "user register"
//             })

//         } catch (error) {
//             res.status(500).json({
//                 message: error.message,
//             })
//         }
//     }

// })


router.post("/verifyUser", async (req, res) => {
  try {
    const { otp, activationToken } = req.body;

    if (!otp || !activationToken) {
      return res.status(400).json({
        message: "OTP and activation token required",
      });
    }
    const verify = jwt.verify(
      activationToken,
      process.env.Activation_Secret
    );
    if (Number(verify.otp) !== Number(otp)) {
      return res.status(400).json({
        message: "OTP is wrong",
      });
    }
    await User.create({
      name: verify.user.name,
      email: verify.user.email,
      password: verify.user.password,
    });

    res.status(201).json({
      message: "User verified successfully",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        message: "OTP expired",
      });
    }
    res.status(500).json({
      message: error.message,
    });
  }
});


router.post('/login', async (req, res) => {

  try {
    const { email, password } = req.body;
    const isLogin = await User.findOne({ email });

    if (!isLogin) {
      return res.status(400).json({
        message: "No user with this email"
      })
    }

    const matchPass = await bcrypt.compare(password, isLogin.password)

    if (!matchPass) {
      return res.status(400).json({
        message: "invailid password"
      })
    }

    const token = jwt.sign({ _id: isLogin._id }, process.env.Jwt_Sec, {
      expiresIn: "15d",
    })
    res.json({
      message: `Welcome Back ${isLogin.name}`,
      token,
      isLogin,
    })
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }

})


router.get('/me', isAuth, async (req, res) => {

  try {
    const user = await User.findById(req.user._id)

    res.json({
      user
    })
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
})



// profile 

router.put(
  "/update-profile",
  isAuth,
  uploadfiles,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user)
        return res.status(404).json({ message: "User not found" });

      // 🔹 Name update
      if (req.body.name) {
        user.name = req.body.name;
      }

      // 🔹 Profile pic upload (local)
      if (req.file) {
        // purani image delete
        if (user.avatar?.url) {
          fs.unlink(`.${user.avatar.url}`, () => { });
        }

        user.avatar = {
          url: `/uploads/${req.file.filename}`,
        };
      }

      await user.save();

      res.json({
        message: "Profile updated successfully",
        user,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


// FORGOT PASSWORD

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({
        message: "No user With this email"
      })
    }
    const token = jwt.sign({ email }, process.env.Forget_Secret)
    const data = { email, token };

    await sendForgetMail("Learnify", data);
    user.resetPasswordExpire = Date.now() + 5 * 60 * 1000;
    await user.save();
    res.json({
      message: "Reset Password Link is send to You mail"
    })
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})



// reset password
router.post('/reset-password', async (req, res) => {
  try {
    const decodedData = jwt.verify(req.query.token, process.env.Forget_Secret)
    const user = await User.findOne({ email: decodedData.email })
    if (!user) {
      return res.status(404).json({
        message: "No user with this email"
      })
    }
    if (user.resetPasswordExpire === null) {
      return res.status(400).json({
        message: "Token Expired"
      })
    }

    if (user.resetPasswordExpire < Date.now()) {
      return res.status(400).json({
        message: "Token Expired"
      })
    }

    const password = await bcrypt.hash(req.body.password, 10)

    user.password = password;

    user.resetPasswordExpire = null

    await user.save()

    res.json({
      message: "Password Reset"
    })

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})



// contact 




router.post('/contact-us', async (req, res) => {
  try {
    const { name, email, mobile, subject, message } = req.body;

    // seedha save, koi extra logic nahi
    const data = new ContactModel({
      name,
      email,
      mobile,
      subject,
      message
    });

    await data.save();

    res.json({
      message: "message send"
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


export default router;