var express = require('express');
var connect   = require('connect');
var passport  = require('passport');

var http = require('http');
var xtend = require('xtend');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var socketIo = require('socket.io'),
    passportSocketIo = require('../../lib');

var sessionStore    = new connect.session.MemoryStore(),
    sessionSecret  = 'asdasdsdas1312312',
    sessionKey    = 'test-session-key',
    sessionOptions = {
      store:  sessionStore,
      key:    sessionKey,
      secret: sessionSecret,
      saveUninitialized: true,
      resave: true
    };

var server;

require('./setupPassport');

exports.start = function (options, callback) {

  if(typeof options == 'function'){
    callback = options;
    options = {};
  }

  var app = express();

  (function(){
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({extended: true}));

    app.use(session(sessionOptions));

    app.use(passport.initialize());
    app.use(passport.session());
  }).call(app);

  app.post('/login', passport.authenticate('local', { successRedirect: '/',
                                                      failureRedirect: '/login',
                                                      failureFlash: true }));

  app.get('/', function(req, res){
    if(!req.user){
      res.send(401);
    }else{
      res.json(req.user);
    }
  });

  server = http.createServer(app);

  var sio = socketIo.listen(server);
  sio.configure(function(){
    var authorization = passportSocketIo.authorize(xtend(sessionOptions, options, {
      cookieParser: cookieParser
    }));

    this.set('authorization', authorization);

    this.set('log level', 0);

  });

  sio.sockets.on('echo', function (m) {
    sio.sockets.emit('echo-response', m);
  });

  server.listen(9000, callback);
};

exports.stop = function (callback) {
  server.close();
  callback();
};