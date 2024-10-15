const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); 
const session = require('express-session'); 
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = 3000;

// PostgreSQL Database connection
const pool = new Pool({
  user: 'christianbutler', 
  host: 'localhost',
  database: 'BlogDB', 
  port: 5432,
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.set('view engine', 'ejs');

// Serve static files (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Home Page - View Blog Posts
app.get('/', (req, res) => {
  pool.query('SELECT * FROM blogs ORDER BY date_created DESC', (err, result) => {
    if (err) {
      console.error(err);
      return res.send('Error retrieving blog posts.');
    }
    res.render('index', { blogs: result.rows, user: req.session.user });
  });
});

// Signup Page
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Signup Route
app.post('/signup', async (req, res) => {
  const { name, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  pool.query('INSERT INTO users (name, password) VALUES ($1, $2)', [name, hashedPassword], (err) => {
    if (err) {
      console.error(err);
      return res.send('Error during signup.');
    }
    res.redirect('/signin');
  });
});

// Signin Page
app.get('/signin', (req, res) => {
  res.render('signin', { message: null });
});

// Signin Route
app.post('/signin', (req, res) => {
  const { name, password } = req.body;
  pool.query('SELECT * FROM users WHERE name = $1', [name], (err, result) => {
    if (err || result.rows.length === 0) {
      return res.render('signin', { message: 'Invalid username or password. Try again.' });
    }
    const user = result.rows[0];
    bcrypt.compare(password, user.password, (err, same) => {
      if (same) {
        req.session.user = { id: user.user_id, name: user.name };  // Store username and ID in session
        res.redirect('/');
      } else {
        res.render('signin', { message: 'Invalid username or password. Try again.' });
      }
    });
  });
});

// Create Blog Post Page
app.get('/create-post', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/signin');
  }
  res.render('create-post');
});

// Create Blog Post Route
app.post('/create-post', (req, res) => {
  const { creator_name, title, body } = req.body;
  if (!req.session.user) {
    return res.redirect('/signin');
  }
  pool.query('INSERT INTO blogs (creator_name, creator_user_id, title, body) VALUES ($1, $2, $3, $4)', 
    [creator_name, req.session.user.id, title, body], (err) => {
      if (err) {
        console.error(err);
        return res.send('Error creating blog post.');
      }
      res.redirect('/');
    });
});

// Edit Blog Post Page
app.get('/edit-post/:id', (req, res) => {
  const postId = req.params.id;
  pool.query('SELECT * FROM blogs WHERE blog_id = $1', [postId], (err, result) => {
    if (err || result.rows.length === 0) {
      return res.send('Post not found.');
    }
    res.render('edit-post', { blog: result.rows[0] });
  });
});

// Edit Blog Post Route
app.post('/edit-post/:id', (req, res) => {
  const postId = req.params.id;
  const { title, body } = req.body;
  pool.query('UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3', 
    [title, body, postId], (err) => {
      if (err) {
        console.error(err);
        return res.send('Error updating blog post.');
      }
      res.redirect('/');
    });
});

// Delete Blog Post Route
app.post('/delete-post/:id', (req, res) => {
  const postId = req.params.id;
  pool.query('DELETE FROM blogs WHERE blog_id = $1', [postId], (err) => {
    if (err) {
      console.error(err);
      return res.send('Error deleting blog post.');
    }
    res.redirect('/');
  });
});

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Start the server
app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
