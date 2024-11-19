const express = require("express");
const { body, validationResult } = require("express-validator");
const csrf = require("csurf");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const argon2 = require('argon2');
const mysql = require("mysql2/promise");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const dotenv = require("../lib/dotenv");
dotenv.load();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const pool = mysql.createPool(dbConfig);
const sessionStore = new MySQLStore({}, pool);

const PORT = 3000;
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
  key: 'session_cookie_name',
  secret: 'session_cookie_secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

const hashPassword = async (password) => {
  try {
    return await argon2.hash(password, { type: argon2.argon2id });
  } catch (err) {
    throw new Error('Error hashing password: ' + err.message);
  }
};

const verifyPassword = async (password, hashedPassword) => {
  try {
    return await argon2.verify(hashedPassword, password);
  } catch (err) {
    throw new Error('Error verifying password: ' + err.message);
  }
};

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/zaregistrirovatsya", csrfProtection, (req, res) => {
  res.render("signup", { csrfToken: req.csrfToken() });
});

app.get("/voyti", csrfProtection, (req, res) => {
  res.render("signin", { csrfToken: req.csrfToken() });
});

app.post(
  "/zaregistrirovatsya",
  [
    body("username")
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Username must be 3-20 characters and only include letters, numbers, underscores, or hyphens."),
    body("email").isEmail().withMessage("Please provide a valid email address."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long."),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }
      return true;
    }),
    body("birthdate").isDate().withMessage("Please provide a valid date."),
    body("nickname").trim().isLength({ min: 3, max: 150 }).withMessage("Nickname is required.")
  ], async (req, res) => {
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
      const hashedPassword = await hashPassword(password);
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
  
        const [result] = await connection.execute(
          'INSERT INTO users (username, email, password, birth_date, nickname, bio) VALUES (?, ?, ?, ?, ?, ?)',
          [username, email, hashedPassword, birthdate, nickname, bio || null]
        );
  
        await connection.commit();
        
        req.session.userId = result.insertId;
        req.session.username = username;
        
        res.status(201).json({ message: 'User registered successfully' });
      } catch (error) {
        await connection.rollback();
        
        if (error.code === 'ER_DUP_ENTRY') {
          if (error.message.includes('username')) {
            return res.status(400).json({ errors: { username: 'Username already exists' } });
          }
          if (error.message.includes('email')) {
            return res.status(400).json({ errors: { email: 'Email already exists' } });
          }
        }
        
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'An error occurred during registration' });
    }
  }
);

app.post(
  "/voyti",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long.")
  ], async (req, res) => {
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

      const connection = await pool.getConnection();
      try {
        const [users] = await connection.execute(
          'SELECT id, username, password, nickname FROM users WHERE email = ?',
          [email]
        );

        if (users.length === 0) {
          return res.status(400).json({ 
            errors: { email: 'Invalid email or password' }
          });
        }

        const user = users[0];
        const isValidPassword = await verifyPassword(password, user.password);

        if (!isValidPassword) {
          return res.status(400).json({ 
            errors: { email: 'Invalid email or password' }
          });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.nickname = user.nickname;

        res.json({ success: true, redirectUrl: '/?home=feed' });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'An error occurred during login' });
    }
  }
);


app.get("/dobro-pozhalovat", (req, res) => {
  res.render("welcome");
});

app.listen(PORT, () => {
  console.log(`Сервер работает на http://localhost:${PORT}`);
});