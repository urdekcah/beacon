const express = require("express");
const { body, validationResult } = require("express-validator");
const csrf = require("csurf");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const argon2 = require('argon2');
const mysql = require("mysql2/promise");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const { requireAuth, requireAuthJson } = require('./middleware/auth');

const fs = require("fs");
const TOML = require('@iarna/toml');
const dotenv = require("../lib/dotenv");
dotenv.load();
const CONFIG = loadConfig();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const pool = mysql.createPool(dbConfig);
const sessionStore = new MySQLStore({}, pool);

const PORT = CONFIG["server"]["port"];
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

function loadConfig() {
  if (!fs.existsSync('./Beacon.toml')) {
    console.error('Config file not found');
    process.exit(1);
  }

  const config = fs.readFileSync('./Beacon.toml', 'utf8');
  return TOML.parse(config);
}

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

app.get("/sozdat", requireAuth, csrfProtection, (req, res) => {
  res.render("create", {
    colors: CONFIG["community"]["allowed_colors"],
    icons: CONFIG["community"]["allowed_icons"],
    csrfToken: req.csrfToken()
  });
});

app.post(
  "/sozdat",
  requireAuth,
  csrfProtection,
  [
    body("name")
    .matches(/^[a-zA-Z0-9_-]+$/)
      .isLength({ min: 3, max: 21 })
      .withMessage("Community name must be 3-21 characters long."),
    body("description")
      .isLength({ min: 3, max: 150 })
      .withMessage("Description must be 3-150 characters long."),
  ], async (req, res) => {
    const connection = await pool.getConnection();
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

      const { name, description, color, icon } = req.body;
      const tags = req.body.tags.split(",").map(tag => tag.trim());
      const userId = req.session.userId;

      if (tags.length > 5) {
        return res.status(400).json({ 
          errors: { tags: 'You can only add up to 5 tags' }
        });
      }

      if (!CONFIG["community"]["allowed_colors"].includes(color)) {
        return res.status(400).json({ 
          errors: { color: 'Invalid color' }
        });
      }

      if (!CONFIG["community"]["allowed_icons"].includes(icon)) {
        return res.status(400).json({ 
          errors: { icon: 'Invalid icon' }
        });
      }

      await connection.beginTransaction();

      const [existing] = await connection.execute(
        'SELECT id FROM communities WHERE LOWER(name) = LOWER(?)',
        [name]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          errors: { name: 'Community name already exists' }
        });
      }

      const [result] = await connection.execute(
        `INSERT INTO communities 
         (name, description, icon, color, tags, creator_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, icon, color, JSON.stringify(tags), userId]
      );

      await connection.execute(
        `INSERT INTO community_memberships 
         (community_id, user_id)
         VALUES (?, ?)`,
        [result.insertId, userId]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        redirectUrl: `/b/${name}`
      });
    } catch (error) {
      await connection.rollback();
    
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          errors: { name: 'Community name already exists' }
        });
      }

      console.error('Create community error:', error);
      res.status(500).json({
        error: 'An error occurred while creating the community'
      });
    } finally {
      connection.release();
    }
  }
)

app.post(
  "/zaregistrirovatsya",
  csrfProtection,
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
  csrfProtection,
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

app.get("/b/:name", csrfProtection, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [communities] = await connection.execute(
      `SELECT c.*, u.nickname as creator_username 
       FROM communities c 
       LEFT JOIN users u ON c.creator_id = u.id 
       WHERE LOWER(c.name) = LOWER(?)`,
      [req.params.name]
    );

    if (communities.length === 0) {
      // return res.status(404).render("404", {
      //   message: "Community not found"
      // });
      return res.status(404).json({ error: 'Community not found' });
    }

    const community = communities[0];

    let isMember = false;
    
    if (req.session.userId) {
      const [memberships] = await connection.execute(
        `SELECT * FROM community_memberships 
         WHERE community_id = ? AND user_id = ?`,
        [community.id, req.session.userId]
      );
      
      isMember = memberships.length > 0;
      isAdmin = community.creator_id === req.session.userId;
    }

    res.render("board", {
      community,
      isMember,
      isAdmin,
      isLoggedIn: !!req.session.userId,
      csrfToken: req.csrfToken()
    });

  } catch (error) {
    console.error('Community page error:', error);
    return res.status(500).end();
    // res.status(500).render("error", {
    //   message: "An error occurred while loading the community"
    // });
  } finally {
    connection.release();
  }
});

app.post("/i/UpdateSubscriptions", requireAuthJson, csrfProtection, async (req, res) => {
  const { communityId, subscribeState } = req.body;
  const userId = req.session.userId;

  const handleError = (status, message) => res.status(status).json({ error: message });

  const connection = await pool.getConnection();
  try {
    const [[community]] = await connection.execute(
      'SELECT creator_id FROM communities WHERE id = ?',
      [communityId]
    );

    if (!community) {
      return handleError(400, 'Community not found');
    }

    const [[membership]] = await connection.execute(
      'SELECT 1 FROM community_memberships WHERE community_id = ? AND user_id = ?',
      [communityId, userId]
    );

    if (subscribeState === 'SUBSCRIBED') {
      if (membership) {
        return handleError(400, 'Already subscribed');
      }
      await connection.execute(
        'INSERT INTO community_memberships (community_id, user_id) VALUES (?, ?)',
        [communityId, userId]
      );
    } 
    else if (subscribeState === 'NONE') {
      if (community.creator_id === userId) {
        return handleError(400, 'Owner cannot unsubscribe');
      }
      if (!membership) {
        return handleError(400, 'Not subscribed');
      }
      await connection.execute(
        'DELETE FROM community_memberships WHERE community_id = ? AND user_id = ?',
        [communityId, userId]
      );
    }
    else {
      return handleError(400, 'Invalid subscription state');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update subscriptions error:', error);
    handleError(500, 'An error occurred while updating subscriptions');
  } finally {
    connection.release();
  }
});

app.get("/dobro-pozhalovat", (req, res) => {
  res.render("welcome");
});

app.listen(PORT, () => {
  console.log(`Сервер работает на http://localhost:${PORT}`);
});