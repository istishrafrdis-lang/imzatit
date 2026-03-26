const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// تشفير كلمة المرور
const hashPassword = async (password) => {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
};

// التحقق من كلمة المرور
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// إنشاء JWT Token
const generateToken = (userId, email, role) => {
    return jwt.sign(
        { id: userId, email, role },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// التحقق من JWT Token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// توليد رمز تحقق عشوائي
const generateVerificationCode = () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// توليد رمز إحالة
const generateReferralCode = (userId) => {
    return `IMZ-${userId}-${Date.now().toString(36).toUpperCase()}`;
};

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    generateVerificationCode,
    generateReferralCode
};
