var xtend = require('xtend');

var ERROR_CORS_REQUEST              = 'Can not read cookies from CORS-Requests. See CORS-Workaround in the readme.';
var ERROR_NO_COOKIE_PARSER          = 'cookieParser is required use require(\'cookie-parser\'), connect.cookieParser or express.cookieParser';
var ERROR_NO_SESSION                = 'No session found';
var ERROR_PASSPORT_NOT_INITIALIZED  = 'Passport was not initialized';
var ERROR_SESSION_STORE             = 'Error in session store:';
var ERROR_USER_NOT_AUTHORIZED       = 'User not authorized through passport. (User Property not found)';
var ERROR_USER_NOT_FOUND            = 'User not found';

function parseCookie(auth, cookieHeader) {
  var cookieParser = auth.cookieParser(auth.secret);
  var req = {
    headers:{
      cookie: cookieHeader
    }
  };
  var result;
  cookieParser(req, {}, function (err) {
    if (err) throw err;
    result = req.signedCookies || req.cookies;
  });
  return result;
}

function authorize(options) {
  var defaults = {
    passport:     require('passport'),
    key:          'connect.sid',
    secret:       null,
    store:        null,
    success:      function (data, accept){
      if (data.socketio_version_1) {
        accept();
      } else {
        accept(null, true);
      }
    },
    fail:         function (data, message, critical, accept) {
      if (data.socketio_version_1) {
        accept(new Error(message));
      } else {
        accept(null, false);
      }
    }
  };

  var auth = xtend(defaults, options);

  auth.userProperty = auth.passport._userProperty || 'user';

  if (!auth.cookieParser) {
    try {
      auth.cookieParser = require('cookie-parser');
    } catch (err) {
      throw new Error(ERROR_NO_COOKIE_PARSER);
    }
  }

  return function(data, accept){

    // socket.io v1.0 now provides socket handshake data via `socket.request`
    if (data.request) {
      data = data.request;
      data.socketio_version_1 = true;
    }

    data.cookie = parseCookie(auth, data.headers.cookie || '');
    data.sessionID = (data.query && data.query.session_id) || (data._query && data._query.session_id) || data.cookie[auth.key] || '';
    data[auth.userProperty] = {
      logged_in: false
    };

    if(data.xdomain && !data.sessionID)
      return auth.fail(data, ERROR_CORS_REQUEST, false, accept);

    auth.store.get(data.sessionID, function(err, session){
      if(err)
        return auth.fail(data, ERROR_SESSION_STORE + '\n' + err.message, true, accept);
      if(!session)
        return auth.fail(data, ERROR_NO_SESSION, false, accept);
      if(!session[auth.passport._key])
        return auth.fail(data, ERROR_PASSPORT_NOT_INITIALIZED, true, accept);

      var userKey = session[auth.passport._key][auth.userProperty];

      if(typeof(userKey) === 'undefined')
        return auth.fail(data, ERROR_USER_NOT_AUTHORIZED, false, accept);

      auth.passport.deserializeUser(userKey, data, function(err, user) {
        if (err)
          return auth.fail(data, err, true, accept);
        if (!user)
          return auth.fail(data, ERROR_USER_NOT_FOUND, false, accept);
        data[auth.userProperty] = user;
        data[auth.userProperty].logged_in = true;
        auth.success(data, accept);
      });

    });
  };
}

function filterSocketsByUser(socketIo, filter){
  var handshaken = [];
  for ( var i in socketIo.sockets.connected )
    if ( socketIo.sockets.connected[i].handshake )
        handshaken.push( socketIo.sockets.connected[i] )

  return Object.keys(handshaken || {})
    .filter(function(skey){
      return filter(handshaken[skey].conn.request.user);
    })
    .map(function(skey){
      return handshaken[skey];
    });
}

exports.authorize = authorize;
exports.filterSocketsByUser = filterSocketsByUser;

exports.ERROR_CORS_REQUEST              = ERROR_CORS_REQUEST;
exports.ERROR_NO_COOKIE_PARSER          = ERROR_NO_COOKIE_PARSER;
exports.ERROR_NO_SESSION                = ERROR_NO_SESSION;
exports.ERROR_PASSPORT_NOT_INITIALIZED  = ERROR_PASSPORT_NOT_INITIALIZED;
exports.ERROR_SESSION_STORE             = ERROR_SESSION_STORE;
exports.ERROR_USER_NOT_AUTHORIZED       = ERROR_USER_NOT_AUTHORIZED;
exports.ERROR_USER_NOT_FOUND            = ERROR_USER_NOT_FOUND;
