const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const expressSession = require('express-session');
const flash = require('connect-flash');
const cors = require('cors');
const passport = require('passport');
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
const passportLocalMongoose = require('passport-local-mongoose');
const passportLocal = require('passport-local').Strategy;
const { spawn } = require('child_process');

// Import routes
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();
const port = 8000;

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/pintproj")
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware setup
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(flash());

// Session configuration
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: "hey ram ram"
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Configure passport
const User = require('./routes/users');
passport.use(new passportLocal(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// View engine setup
app.set('views', path.join(__dirname, '../frontend/views'));
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Use routes
app.use('/', indexRouter);
app.use('/users', usersRouter);

// Start CV Model and Gemini API
let cvProcess = null;
let geminiProcess = null;

function startCVModel() {
    cvProcess = spawn('python', ['python_app/app.py']);
    cvProcess.stdout.on('data', (data) => {
        console.log(`CV Model: ${data}`);
    });
    cvProcess.stderr.on('data', (data) => {
        console.error(`CV Model Error: ${data}`);
    });
}

function startGeminiAPI() {
    geminiProcess = spawn('python', ['python_app/chatbot_gemini.py']);
    geminiProcess.stdout.on('data', (data) => {
        console.log(`Gemini API: ${data}`);
    });
    geminiProcess.stderr.on('data', (data) => {
        console.error(`Gemini API Error: ${data}`);
    });
}

// Start both processes when server starts
startCVModel();
startGeminiAPI();

// API Endpoints
app.get('/questions', (req, res) => {
    fs.readFile(path.join(__dirname, 'questionsbank.json'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading questions:', err);
            return res.status(500).send('Error reading questions');
        }
        res.send(data);
    });
});

app.post('/save-answer', (req, res) => {
    const answers = req.body;
    fs.writeFile(path.join(__dirname, 'answers.json'), JSON.stringify(answers, null, 2), (err) => {
        if (err) {
            console.error('Error saving answers:', err);
            return res.status(500).send('Error saving answers');
        }
        res.send('Successfully saved the answers');
    });
});

// CV Model API endpoint
app.post('/analyze-cv', (req, res) => {
    const cvData = req.body;
    // Send CV data to CV model
    axios.post('http://localhost:5000/analyze', cvData)
        .then(response => {
            res.json(response.data);
        })
        .catch(error => {
            console.error('CV Analysis Error:', error);
            res.status(500).send('Error analyzing CV');
        });
});

// Gemini API endpoint
app.post('/ask-gemini', (req, res) => {
    const question = req.body.question;
    // Send question to Gemini API
    axios.post('http://localhost:5001/ask', { question })
        .then(response => {
            res.json(response.data);
        })
        .catch(error => {
            console.error('Gemini API Error:', error);
            res.status(500).send('Error getting response from Gemini');
        });
});

// OpenCV Model Process
let opencvProcess = null;

function startOpenCVModel() {
  if (opencvProcess) {
    console.log('OpenCV model is already running');
    return;
  }

  console.log('Starting OpenCV model...');
  opencvProcess = spawn('python', ['interview_materials/CV IP1/app.py']);

  opencvProcess.stdout.on('data', (data) => {
    console.log(`OpenCV Model: ${data}`);
  });

  opencvProcess.stderr.on('data', (data) => {
    console.error(`OpenCV Model Error: ${data}`);
  });

  opencvProcess.on('close', (code) => {
    console.log(`OpenCV Model process exited with code ${code}`);
    opencvProcess = null;
  });
}

function stopOpenCVModel() {
  if (opencvProcess) {
    console.log('Stopping OpenCV model...');
    opencvProcess.kill();
    opencvProcess = null;
  }
}

// API endpoint to start OpenCV model
app.post('/start-opencv', (req, res) => {
  try {
    startOpenCVModel();
    res.json({ success: true, message: 'OpenCV model started successfully' });
  } catch (error) {
    console.error('Error starting OpenCV model:', error);
    res.status(500).json({ success: false, message: 'Failed to start OpenCV model' });
  }
});

// API endpoint to stop OpenCV model
app.post('/stop-opencv', (req, res) => {
  try {
    stopOpenCVModel();
    res.json({ success: true, message: 'OpenCV model stopped successfully' });
  } catch (error) {
    console.error('Error stopping OpenCV model:', error);
    res.status(500).json({ success: false, message: 'Failed to stop OpenCV model' });
  }
});

// Error handling
app.use((req, res, next) => {
    res.status(404).render('error', { message: 'Page not found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something broke!' });
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
    if (cvProcess) cvProcess.kill();
    if (geminiProcess) geminiProcess.kill();
    stopOpenCVModel();
    process.exit();
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
