var connectUtils = require('connect').utils,
    cookie = require('cookie');

var overwrite = function(overwritten) {
  return (function() {
    if( arguments.length > 1 ) {
      for(var objects in arguments ) {
        overwrite( this, arguments[objects] );
      }
    }

    for( var key in arguments[0] ) {
      if( arguments[0].hasOwnProperty(key) ) {
        this[key] = arguments[0][key];
      }
    }

    return this;
  }).apply(overwritten, Array.prototype.slice.call(arguments, 1));
};

function authorize(options) {
  var auth = {
    passport: require('passport'),
    sessionKey: 'express.sid',
    sessionSecret: null,
    sessionStore: null,
    success: null,
    fail: null
  };

  overwrite( auth, options );

  auth.userProperty = auth.passport._userProperty || 'user';

  return function(data, accept){
    if (!data.headers.cookie) {
      return accept(null, false);
    }

    var parsedCookie = cookie.parse(data.headers.cookie);

    data.cookie = connectUtils.parseSignedCookies(parsedCookie, auth.sessionSecret);

    data.sessionID = data.cookie[ auth.sessionKey ];

    auth.sessionStore.get(data.sessionID, function(err, session){
      if (err) {
        return accept('Error in session store.', false);
      } else if (!session) {
        return accept(null, false);
      }

      if( !session[ auth.passport._key ] ){
        return accept('passport was not initialized', false);
      }

      var userKey = session[ auth.passport._key ][ auth.userProperty ];

      if( !userKey && auth.fail ) {
        return auth.fail( data, accept );
      } else if( !userKey ) {
        return accept(null, false);
      }

      if( auth.success ) {
        auth.passport.deserializeUser(userKey, function(err, user) {
          data[ auth.userProperty ] = user;
          return auth.success( data, accept );
        });
      }
      auth.passport.deserializeUser(userKey, function(err, user) {
        data[ auth.userProperty ] = user;
        return accept(null, true);
      });

    });
  };
}

function filterSocketsByUser(socketIo, filter){
  var handshaken = socketIo.sockets.manager.handshaken;
  return Object.keys(handshaken || {})
    .filter(function(skey){
      return filter(handshaken[skey].user);
    })
    .map(function(skey){
      return socketIo.sockets.manager.sockets.sockets[skey];
    });
}

exports.authorize = authorize;
exports.filterSocketsByUser = filterSocketsByUser;
