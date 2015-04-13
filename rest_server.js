var restify = require('restify');
var fs = require('fs');

var surveyFile = "./resources/survey.json";
var matchFile = "./resources/surveyanswers.json";
var port = 8888;

var server = restify.createServer();
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/questions', getAllQuestions);
server.get('/answers', getAllAnswers);
//server.post();
//server.put();
//server.delete();

server.listen(port, function() {
  console.log("listening on port %s", port);
});

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