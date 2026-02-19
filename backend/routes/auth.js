const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// إنشاء توكن JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @route   POST /api/auth/register
// @desc    تسجيل مستخدم جديد
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('الاسم مطلوب'),
    body('email').isEmail().withMessage('بريد إلكتروني غير صحيح'),
    body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
  ],
  async (req, res) => {
    // التحقق من صحة المدخلات
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, password } = req.body;

    try {
      // التحقق من عدم وجود المستخدم
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ 
          success: false, 
          message: 'البريد الإلكتروني مسجل بالفعل' 
        });
      }

      // إنشاء المستخدم
      const user = await User.create({ name, email, password });

      // إنشاء توكن
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        success: false, 
        message: 'حدث خطأ في الخادم' 
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    تسجيل الدخول
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('بريد إلكتروني غير صحيح'),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    try {
      // البحث عن المستخدم مع جلب كلمة المرور
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
        });
      }

      // التحقق من كلمة المرور
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
        });
      }

      // إنشاء توكن
      const token = generateToken(user._id);

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        success: false, 
        message: 'حدث خطأ في الخادم' 
      });
    }
  }
);

// @route   GET /api/auth/me
// @desc    الحصول على بيانات المستخدم الحالي (محمي)
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
