var restify = require('restify');
var fs = require('fs');

var surveyFile = "./resources/survey.json";
var matchFile = "./resources/surveyanswers.json";
var port = 8888;

var server = restify.createServer();
server.use(restify.queryParser());
server.use(restify.bodyParser());

// question info
server.get('/questions', getAllQuestions);
server.get('/questions/:num', getQuestion);
server.get('/questions_count', getNumQuestions);

// match data/previous answers
server.get('/results', getAllAnswers);
server.get('/results/:user', getUserAnswers);
//server.post();
//server.put();
//server.delete();

server.listen(port, function() {
  console.log("listening on port %s", port);
});

// question functions
function getAllQuestions(req, res, next) {
  fs.readFile(surveyFile, function(err, data) {
    if (data) {
      var surveyData = JSON.parse(data);
      res.send(200, surveyData);
      next();
    }else {
      next(err);
    }
  });
}

function getQuestion(req, res, next) {
  fs.readFile(surveyFile, function(err, data) {
    if (data) {
      var surveyData = JSON.parse(data);
      var question = surveyData.questions[req.params.num];
      if (question) {
        res.send(200, question);
      }else {
        res.send(404);
      }
      next();
    }else {
      next(err);
    }
  });
}

function getNumQuestions(req, res, next) {
   fs.readFile(surveyFile, function(err, data) {
    if (data) {
      var surveyData = JSON.parse(data);
      var numQuestions = surveyData.questions.length;
      res.send(200, numQuestions);
      next();
    }else {
      next(err);
    }
  });
}

// answer functions
function getAllAnswers(req, res, next) {
  fs.readFile(matchFile, function(err, data) {
    if (data) {
      var matchData = JSON.parse(data);
      res.send(200, matchData);
      next();
    }else {
      next(err);
    }
  });
}

function getUserAnswers(req, res, next) {
  fs.readFile(matchFile, function(err, data) {
    if (data) {
      var matchData = JSON.parse(data);
      var userAnswers;
      for (var i=0; i < matchData.results.length; i++) {
        if (matchData.results[i].username === req.params.user) {
          userAnswers = matchData.results[i].answers;
          break;
        }
      }
      res.send(200, userAnswers);
      next();
    }else {
      next(err);
    }
  });
}