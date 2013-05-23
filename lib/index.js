var connectUtils = require('connect').utils,
    cookie = require('cookie'),
    xtend = require('xtend');

function authorize(options) {
  var defaults = {
    passport: require('passport'),
    key: 'connect.sid',
    secret: null,
    store: null,
    success: null,
    fail: null
  };

  var auth = xtend({}, defaults, options );

  auth.userProperty = auth.passport._userProperty || 'user';
  auth.fail = auth.fail || function(data, accept){accept(data, false)};

  return function(data, accept){
    if (!data.headers.cookie) {
      return auth.fail('Cookie not found in header', false);
    }

    var parsedCookie = cookie.parse(data.headers.cookie);

    data.cookie = connectUtils.parseSignedCookies(parsedCookie, auth.secret);

    data.sessionID = data.cookie[ auth.key ];

    auth.store.get(data.sessionID, function(err, session){
      if (err) {
        return auth.fail( 'Error in session store.', accept );
      } else if (!session) {
		  console.log("Dump:", data, auth.store);
	    return auth.fail( 'Failed to retrieve session', accept );
      }

      if( !session[ auth.passport._key ] ){
        return auth.fail( 'passport was not initialized', accept );
      }

      var userKey = session[ auth.passport._key ][ auth.userProperty ];

      if( !userKey ) {
        return auth.fail( 'Failed to find user key', accept );
      }

      auth.passport.deserializeUser(userKey, function(err, user) {
        data[ auth.userProperty ] = user;
        if( auth.success ) {
          return auth.success( data, accept );
        }
        accept(null, true);
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
