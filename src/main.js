const express = require("express");
const { body, validationResult } = require("express-validator");
const csrf = require("csurf");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const argon2 = require('argon2');
const mysql = require("mysql2/promise");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const { DatabaseConnection, UserRepository, CommunityRepository, PostRepository, VoteRepository } = require('../lib/db');

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

let db;
let userRepo;
let communityRepo;
let postRepo;
let voteRepo;

async function initializeDatabase() {
  db = await new DatabaseConnection(dbConfig).initialize();
  userRepo = new UserRepository(db);
  communityRepo = new CommunityRepository(db);
  postRepo = new PostRepository(db);
  voteRepo = new VoteRepository(db);
}

initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

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
  key: process.env.COOKIE_NAME || 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'session_secret',
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

app.get("/", (req, res) => {
  if (req.session.userId)
    return res.redirect("/feed");
  return res.render("index");
});

app.get("/zaregistrirovatsya", csrfProtection, (req, res) => {
  res.render("signup", { csrfToken: req.csrfToken() });
});

app.get("/voyti", csrfProtection, (req, res) => {
  res.render("signin", { csrfToken: req.csrfToken() });
});

app.get("/vykhod", requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ error: 'An error occurred while logging out' });
    }
    res.clearCookie(process.env.COOKIE_NAME);
    res.redirect("/");
  });
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

      await db.transaction(async (connection) => {
        const result = await communityRepo.createCommunity({
          name, description, icon, color, tags, creatorId: userId
        });

        await connection.execute(
          `INSERT INTO community_memberships (community_id, user_id) VALUES (?, ?)`,
          [result.insertId, userId]
        );
      });

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
      const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });

      const result = await userRepo.createUser({
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
      const user = await userRepo.findByEmail(email);

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
);

app.get("/feed", requireAuth, csrfProtection, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.session.userId;
    const communities = await communityRepo.getUserCommunities(userId);
    const communityIds = communities.map(c => c.id);

    let posts = [];
    if (communityIds.length > 0) {
      [posts] = await connection.execute(`
        SELECT p.*, u.username as author_username, c.name as community_name
        FROM posts p
        JOIN users u ON p.author_id = u.id
        JOIN communities c ON p.community_id = c.id
        WHERE p.community_id IN (${communityIds.map(() => '?').join(',')})
        ORDER BY p.created_at DESC
      `, [...communityIds]);
    }

    res.render('feed', {
      communities,
      posts,
      csrfToken: req.csrfToken(),
      isLoggedIn: true
    });
  } catch (error) {
    console.error('Feed page error:', error);
    res.status(500).render('error', {
      message: 'An error occurred while loading the feed'
    });
  } finally {
    connection.release();
  }
});

app.get("/b/:name", csrfProtection, async (req, res) => {
  try {
    const community = await communityRepo.findByName(req.params.name);

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const postsResult = await postRepo.findByCommunityId(community.id);
    let isMember = false;
    let isAdmin = false;
    
    if (req.session.userId) {
      const [memberships] = await db.getPool().execute(
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
      csrfToken: req.csrfToken(),
      posts: postsResult
    });
  } catch (error) {
    console.error('Community page error:', error);
    return res.status(500).end();
  }
});

app.get("/b/:name/submit", requireAuth, csrfProtection, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const community = await communityRepo.findByName(req.params.name);
    if (!community)
      return res.status(404).json({ error: 'Community not found' });

    let isMember = false;
    
    if (req.session.userId) {
      const [memberships] = await connection.execute(
        `SELECT * FROM community_memberships 
         WHERE community_id = ? AND user_id = ?`,
        [community.id, req.session.userId]
      );
      
      isMember = memberships.length > 0;
    }

    res.render("submit", {
      community,
      isMember,
      isLoggedIn: !!req.session.userId,
      csrfToken: req.csrfToken()
    });

  } catch (error) {
    console.error('Submit page error:', error);
    return res.status(500).end();
  } finally {
    connection.release();
  }
});

app.get("/b/:name/:id", csrfProtection, async (req, res) => {
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
      return res.status(404).json({ error: 'Community not found' });
    }

    const community = communities[0];
    const posts = await postRepo.findByCommunityId(community.id);
    const [post] = posts.filter(p => p.id === parseInt(req.params.id));

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.render("post", {
      community,
      post,
      isLoggedIn: !!req.session.userId,
      csrfToken: req.csrfToken()
    });

  } catch (error) {
    console.error('Post page error:', error);
    return res.status(500).end();
  } finally {
    connection.release();
  }
});

app.post("/i/CreatePost", requireAuthJson, csrfProtection, async (req, res) => {
  const { title, content, targetLanguage, communityName } = req.body;
  const userId = req.session.userId;

  try {
    const community = await communityRepo.findByName(communityName);
    if (!community) {
      return res.status(400).json({ error: 'Community not found' });
    }

    const post = await postRepo.createPost({
      title,
      content,
      communityId: community.id,
      authorId: userId
    });

    res.status(201).json({
      success: true,
      id: post.id
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ 
      error: 'An error occurred while creating the post' 
    });
  }
});

app.post("/i/UpdateSubscriptions", requireAuthJson, csrfProtection, async (req, res) => {
  const { communityId, subscribeState } = req.body;
  const userId = req.session.userId;

  try {
    const community = await communityRepo.findById(communityId);
    if (!community) {
      return res.status(400).json({ error: 'Community not found' });
    }

    const membership = await db.transaction(async (connection) => {
      const [memberships] = await connection.execute(
        'SELECT 1 FROM community_memberships WHERE community_id = ? AND user_id = ?',
        [communityId, userId]
      );
      return memberships[0];
    });

    if (subscribeState === 'SUBSCRIBED') {
      if (membership) {
        return res.status(400).json({ error: 'Already subscribed' });
      }
      await communityRepo.addMember(communityId, userId);
    } 
    else if (subscribeState === 'NONE') {
      if (community.creator_id === userId) {
        return res.status(400).json({ error: 'Owner cannot unsubscribe' });
      }
      if (!membership) {
        return res.status(400).json({ error: 'Not subscribed' });
      }
      await communityRepo.removeMember(communityId, userId);
    }
    else {
      return res.status(400).json({ error: 'Invalid subscription state' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update subscriptions error:', error);
    res.status(500).json({ error: 'An error occurred while updating subscriptions' });
  }
});

app.post("/i/UpdatePostVoteState", requireAuthJson, csrfProtection, async (req, res) => {
  const { voteState } = req.body;
  const communityId = parseInt(req.body.communityId);
  const postId = parseInt(req.body.postId);
  const userId = req.session.userId;

  try {
    const community = await communityRepo.findById(communityId);
    if (!community) {
      return res.status(400).json({ error: 'Community not found' });
    }

    const post = await postRepo.findById(postId);
    if (!post) {
      return res.status(400).json({ error: 'Post not found' });
    }

    if (post.community_id !== communityId) {
      return res.status(400).json({ error: 'Post does not belong to this community' });
    }

    const voteValue = voteState === 'UP' ? 1 : -1;
    await voteRepo.vote(postId, userId, voteValue);
    const updatedPost = await postRepo.findById(postId);
    res.json({ success: true, vote_count: updatedPost.vote_count });

  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'An error occurred while processing your vote' });
  }
});

app.get("/dobro-pozhalovat", (req, res) => {
  res.render("welcome");
});

app.listen(PORT, () => {
  console.log(`Сервер работает на http://localhost:${PORT}`);
});