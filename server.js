/*
 * Russ Parmer
 * Kapil Mohan
 * SER422 Lab 3
 * February 26, 2015
 */

var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var url = require('url');
var qs = require('querystring');
var fs = require('fs');
var app = express();

var surveyFile = "./resources/survey.json";
var surveyData;
var matchFile = "./resources/surveyanswers.json";
var matchData;
var timer;
var timerExpired = false;
var preference_default = "horizontal";
var answers;

app.use(cookieParser());
app.use(session({
  secret: 'SER422LAB3',
  resave: false,
  saveUninitialized: false
}));

app.set('port', 8008);
app.set('views', './views');
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  var username = "";
  
  // get username from session and pass username to index.ejs
  if (req.session.username) {
    username = req.session.username;
  }
  res.render('index', {username : username});
});

app.get('/controller', function(req, res) {
  var url_parts = url.parse(req.url, true);
  var action = url_parts.query.action;
  
  // get username from query and set username in session storage
  req.session.username = url_parts.query.username;
  req.session.questionNum = 0;
  req.session.answers = [];
  
  if (action === "survey") {
    
    // load survey data from json file
    fs.readFile(surveyFile, function(err, data) {
      if (err) throw err;
      surveyData = JSON.parse(data);
      
      // read previous answers and load data if found
      fs.readFile(matchFile, function(err, data) {
        if(err) throw err;
        if (data.length > 0) {
          matchData = JSON.parse(data);
          for (var i=0; i < matchData.results.length; i++) {
            if (req.session.username === matchData.results[i].username) {
              req.session.answers = matchData.results[i].answers;
            }
          }
        }
        start_timer();
        res.redirect('/survey');
      });
    });
  }else if (action === "match") {
    
    // load match data from json file
    fs.readFile(matchFile, function(err, data) {
      if (err) throw err;
      if (data.length > 0) {
        matchData = JSON.parse(data);
      }else {
        matchData = {};
      }
      res.redirect('/match');
    });
  }
});

app.get('/survey', check_timer, function(req, res) {
  var url_parts = url.parse(req.url, true);
  var action = url_parts.query.action;
  var answer = url_parts.query.answer;
  var preference = preference_default;
  
  if (answer) {
    req.session.answers[req.session.questionNum] = answer;
  }
  
  if (req.cookies.preference) {
    preference = req.cookies.preference;
  }
  
  // set question number to display
  if (action === "next") {
    req.session.questionNum += 1;
  }else if (action === "previous") {
    req.session.questionNum -= 1;
  }
  
  if (!surveyData) {
    res.send('Unable to load survey data');
  }else {
    if (req.session.questionNum < surveyData.questions.length) {
      
      // set survey data question and username to display in survey.ejs
      surveyData.questionNum = req.session.questionNum;
      surveyData.username = req.session.username;
      surveyData.preference = preference;
      
      if (req.session.answers[req.session.questionNum]) {
        surveyData.previousAnswer = req.session.answers[req.session.questionNum];
      }else {
        surveyData.previousAnswer = "";
      }
        
      res.render('survey', surveyData);
    }else {
      complete(req, res);
    }
  }
});

app.get('/match', function(req, res) {
  var currentUser = req.session.username;
  var answers = [];
  var matches = [];
  
  if (matchData.results) {
    var numResults = matchData.results.length;
    
    // find answers for current user
    for (var i=0; i < numResults; i++) {
      if (matchData.results[i].username === currentUser){
        answers = matchData.results[i].answers;
        break;
      }
    }

    // calculate number of matched questions with each user
    for (var i=0; i < numResults; i++) {
      var numMatch = 0;
      var username = matchData.results[i].username;
      
      // remove current user from calculation
      if (username === currentUser) continue;
      
      var temp_answers = matchData.results[i].answers;
      for (var j=0; j < answers.length; j++) {
        if (temp_answers[j] === answers[j]) {
          numMatch += 1;
        }
      }
      matches.push({"username": username, "numMatch": numMatch});
    }
    
    // sort from most to fewest matches
    matches.sort(function(a, b) { return parseInt(b.numMatch) - parseInt(a.numMatch) });
    matchData.results = matches;
  }else {
    matchData.results = [];
  }  
  matchData.username = req.session.username
  res.render('match', matchData);
});

app.get('/complete', function(req, res) {
  var message = "Thank you for completing the survey";
  res.render('complete', {message : message});
});

app.get('/preferences', function(req, res) {
  var preference = preference_default;
  
  // set preference if defined
  if (req.cookies.preference) {
    preference = req.cookies.preference;
  }
  
  res.render('preferences', {preference : preference});
});

app.get('/setpreferences', function(req, res) {
  var url_parts = url.parse(req.url, true);
  var preference = url_parts.query.preference;
  
  // set cookie and keep it for one month
  res.cookie('preference', preference, {maxAge: 30*24*60*60*1000});
  res.redirect('/survey');
});

app.listen(app.get('port'), function() {
  console.log("Listening on port " + app.get('port'));
});

// create timer and set timeout to 30 sec
function start_timer() {
  timerExpired = false;
  timer = setTimeout(function() { timerExpired = true;}, 30*1000);
}

// middleware to check timer, if expired complete survey, otherwise show next question
function check_timer(req, res, next) {
  if (timerExpired) {
    complete(req, res);
  }else {
    next();
  }
}

// clear timer, store data and redirect to view complete
function complete(req, res) {
  clearTimeout(timer);
  var username = req.session.username;
  var answers = req.session.answers;
  var survey = { "username": username, "answers": answers};
  var options = {encoding:'utf8', flag:'w'};
  
  fs.readFile(matchFile, function(err, data) {
    if (err) throw err;
    
    // if there are survey answers add to them
    if (data.length > 0) {
      matchData = JSON.parse(data);
      var existingEntry = false;
      
      // replace existing values
      for (var i=0; i < matchData.results.length; i++) {
        if (matchData.results[i].username === username) {
          existingEntry = true;
          matchData.results[i].answers = answers;
        }
      }
      
      // add new values
      if (!existingEntry) {
        matchData.results.push(survey);
      }
      
    // create survey answer format if this is first answer
    }else {
      matchData = { "results": [survey]};
    }
    fs.writeFile(matchFile, JSON.stringify(matchData), options, function(err) {
      if (err) {
        console.log("Failed to save survey");
      }else {
        console.log("Survey saved");
      }
    });
  });
  res.redirect('/complete');
}
