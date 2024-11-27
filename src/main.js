require("../lib/dotenv").load();
const express = require("express");
const csrf = require("csurf");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const { Database, dbConfig } = require('./config/database');
const { loadConfig } = require('./config/server');
const { UserRepository, CommunityRepository, PostRepository, VoteRepository, DatabaseConnection } = require('../lib/db');

const AuthController = require('./controllers/auth.controller');
const CommunityController = require('./controllers/community.controller');

const CONFIG = loadConfig();
const PORT = CONFIG["server"]["port"];

async function startServer() {
  const db = new DatabaseConnection(dbConfig);
  await db.initialize();
  
  const sessionStore = db.getSessionStore();
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
  
  const userRepo = new UserRepository(db);
  const communityRepo = new CommunityRepository(db);
  const postRepo = new PostRepository(db); 
  const voteRepo = new VoteRepository(db);

  const authController = new AuthController(userRepo);
  const communityController = new CommunityController(communityRepo, userRepo);

  app.use('/', require('./routes/index.routes')(communityRepo, postRepo, csrfProtection));
  app.use('/', require('./routes/auth.routes')(authController, csrfProtection));
  app.use('/', require('./routes/community.routes')(communityRepo, communityController, csrfProtection, CONFIG));
  app.use('/', require('./routes/post.routes')(communityRepo, postRepo, voteRepo, csrfProtection));

  app.listen(PORT, () => {
    console.log(`Сервер работает на http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});