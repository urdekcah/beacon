const { validationResult } = require("express-validator");
const argon2 = require('argon2');

class AuthController {
  constructor(userRepo) {
    this.userRepo = userRepo;
  }

  async signup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          errors: errors.array().reduce((acc, err) => {
            acc[err.param] = err.msg;
            return acc;
          }, {})
        });
      }

      const { username, email, password, birthdate, nickname, bio } = req.body;
      const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });

      const result = await this.userRepo.createUser({
        username,
        email,
        password: hashedPassword,
        birthdate,
        nickname,
        bio: bio || null
      });

      req.session.userId = result.insertId;
      req.session.username = username;
      
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('username')) {
          return res.status(400).json({ errors: { username: 'Username already exists' } });
        }
        if (error.message.includes('email')) {
          return res.status(400).json({ errors: { email: 'Email already exists' } });
        }
      }
      
      console.error('Registration error:', error);
      res.status(500).json({ error: 'An error occurred during registration' });
    }
  }

  async signin(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          errors: errors.array().reduce((acc, err) => {
            acc[err.param] = err.msg;
            return acc;
          }, {})
        });
      }

      const { email, password } = req.body;
      const user = await this.userRepo.findByEmail(email);

      if (!user) {
        return res.status(400).json({ 
          errors: { email: 'Invalid email or password' }
        });
      }

      const isValidPassword = await argon2.verify(user.password, password);

      if (!isValidPassword) {
        return res.status(400).json({ 
          errors: { email: 'Invalid email or password' }
        });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.nickname = user.nickname;

      res.json({ success: true, redirectUrl: '/?home=feed' });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'An error occurred during login' });
    }
  }

  async signout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'An error occurred while logging out' });
      }
      res.clearCookie(process.env.COOKIE_NAME);
      res.redirect("/");
    });
  }
}

module.exports = AuthController;