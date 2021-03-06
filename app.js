var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var config = require('./config');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var config = require('./config');
var socket_io = require('socket.io');
var cors = require('cors');
const chatsRouter = require('./routes/chats');

var usersRouter = require('./routes/users');

mongoose.connect(config.mongoUrl).then(() => {
  console.log("Successfully connected to database");
}, (err) => {console.log(err); });

var app = express();

// Socket IO
var io = app.io = socket_io();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(passport.initialize());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
app.use(cors());
app.use('/users', usersRouter);

const sockets = {};

io.use((socket, next) => {
  if(socket.handshake.query && socket.handshake.query.token){
    jwt.verify(socket.handshake.query.token, config.secretKey, (err, decoded) => {
      if(err){
        let err = new Error('Authentication Error');
        err.status = 401;
        return next(err);
      }
      socket.decoded = decoded;
      sockets[decoded._id] = socket.id;
      chatsRouter(io,socket,sockets);
      next();
    });
  }else{
    let err = new Error('Authentication Error');
    err.status = 401;
    return next(err);
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
