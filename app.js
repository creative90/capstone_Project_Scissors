const express = require('express');
const morgan = require('morgan');
const bodyparser = require('body-parser');

const app = express();
require('dotenv').config();

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const logger = require('./logger/logger');
const httpLogger = require('./logger/httpLogger');
const rateLimit = require('express-rate-limit');

const connectToDatabase = require('./database');
const limoRouter = require('./routes/limoRouter');
const { signup, login, verify } = require('./controllers/authController');
const { notFound, errorHandler} = require('./middleware/errorMiddleware');
connectToDatabase();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again in an 15mins!',
});


const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Express API for Scissors',
    version: '1.0.0',
    description:
      'This is a REST API application made with Express. It is a link shortening app.',
    license: {
      name: 'Licensed Under MIT',
      url: 'https://spdx.org/licenses/MIT.html',
    },
    contact: {
      name: 'wilson ezeibekwe',
      url: 'https://github.com/creative90',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server',
    },
    {
      url: 'https://urlscissors.onrender.com',
      description: 'Production seerver',
    },
  ],
};

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJSDoc(options);

//  use morgan to view requests types
if ((process.env.NODE_ENV = 'development')) {
  app.use(morgan('dev'));
}

app.use(express.static('public'));

app.use(httpLogger);
// access request body

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

process.on('uncaughtException', (err) => {
  logger.info('UNHANDLED EXCEPTION! 💥 Shutting Down');
  process.exit(1);
});

// set up ejs file format
app.set('view engine', 'ejs');

// user info (to be rendered) on client side
const info = {
  data: {
    username: null,
    shortenedLimo: null,
    error: null,
    valid: null,
    qr_code: null,
    history: null,
  },
};

// Render the index page
app.get('/', verify, (req, res) => {
  info.data.username = req.user.username;
  info.data.history = req.user.limos;
  res.render('index', info);
});

// render signup page
app.get('/signup', (req, res) => {
  res.render('signup', info);
});

// submit signup info
app.post('/signup', signup, (req, res) => {
  info.data.valid = 'Please Log in.';
  res.render('login', info);
});

// render login page
app.get('/login', (req, res) => {
  res.render('login', info);
});

// post login info
app.post('/login', login);

// verify user's requests to index page
app.use('/', verify, limoRouter);
// consume user requests to index page
app.use('/api/v1/', verify, limoRouter);

app.use('/shorten', limiter);

// render api docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//use error handler middleware
app.use(errorHandler)
app.use(notFound)

// starting the server
const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`app is listening on port : ${process.env.PORT}`);
});

process.on('unhandledRejection', (err) => {
  logger.info('UNHANDLED REJECTION! 💥 Shutting Down');
  server.close(() => {
    process.exit(1);
  });
})

module.exports = app;
