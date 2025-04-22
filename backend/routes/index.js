const express = require('express');
const router = express.Router();
const userModel = require("./users");
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');



const passport = require('passport');
const localStrategy =require('passport-local');
passport.use(new localStrategy(userModel.authenticate()));
const PORT = 5001;

//router.use(bodyParser.json({ limit: '50mb' })); // to handle large image data
router.use(cors());

//router.set('view engine', 'ejs');
//router.set('views', path.join(__dirname, 'views'));


//router.use(cors());
router.use(bodyParser.json({ limit: '50mb' }));
router.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
router.use(express.static(path.join(__dirname, 'public')));

/* GET home page. */
router.get('/index', function(req, res, next) {
  res.render('index');
});

router.get("/login",function(req,res){
  console.log(req.flash("error"));
  res.render('login',{error:req.flash('error')})
});


router.get('/profile',isLoggedIn,function(req,res){
  res.render('dashboard')
});

router.post("/register", (req, res) => {
  const { username, email} = req.body;
  const userData = new userModel({ username, email});

  userModel.register(userData,req.body.password)
  .then(function(){
    passport.authenticate("local")(req,res,function(){
      res.redirect("/dashboard")
    })
  })
});

router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })
);

/*router.get('/questions', (req, res) => {
  fs.readFile('/javascripts/questionsbank.json', 'utf8', (err, data) => {
      if (err) {
          return res.status(500).send('Error reading file');
      }
      res.send(data);
  });
});*/
/*router.post('/save-answer', (req, res) => {
  const answers = req.body;

  // Write the answers to a new JSON file
  fs.writeFile('/javascripts/answers.json', JSON.stringify(answers, null, 2), (err) => {
      if (err) {
          return res.status(500).send('Error writing file');
      }
      res.send('Successfully saved the answers');
  });
});*/

/*router.get('/feed',isLoggedIn,function(req,res){
  res.render('feed')
})*/

router.post('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

router.get('/start',function(req,res){
  
})


function isLoggedIn(req,res,next){
  if(req.isAuthenticated()) return next();
  res.redirect("/login")
}

/////////


// Endpoint to handle video frame
/*router.post('/send-image', async (req, res) => {
  try {
      const response = await axios.post('http://localhost:5001/predict', req.body);
      res.json(response.data);
  } catch (error) {
      res.status(500).json({ error: 'Failed to get prediction' });
  }
});*/

router.get('/dashboard', isLoggedIn, function(req, res) {
  try {
    console.log('Rendering dashboard for user:', req.user);
    res.render('dashboard', { 
      title: 'Dashboard',
      user: req.user,
      style: '',
      script: '',
      layout: false  // Don't use layout since we're including it in the template
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).render('error', { 
      message: 'Error loading dashboard',
      error: error
    });
  }
});

module.exports = router;
