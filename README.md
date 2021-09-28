This module is currently deprecated and unmaintained. Please check [#148](https://github.com/jfromaniello/passport.socketio/issues/148#issue-865236471) which explain how to do this with modern versions of socket.io and using passport directly.


# passport.socketio

> Access [passport.js](http://passportjs.org) user information from a [socket.io](http://socket.io) connection.


## Installation

```
npm install passport.socketio
```

## Example usage


```javascript

// initialize our modules
var io               = require("socket.io")(server),
    sessionStore     = require('awesomeSessionStore'), // find a working session store (have a look at the readme)
    passportSocketIo = require("passport.socketio");

// With Socket.io < 1.0
io.set('authorization', passportSocketIo.authorize({
  cookieParser: express.cookieParser,
  key:         'express.sid',       // the name of the cookie where express/connect stores its session_id
  secret:      'session_secret',    // the session_secret to parse the cookie
  store:       sessionStore,        // we NEED to use a sessionstore. no memorystore please
  success:     onAuthorizeSuccess,  // *optional* callback on success - read more below
  fail:        onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));

//With Socket.io >= 1.0
io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,       // the same middleware you registrer in express
  key:          'express.sid',       // the name of the cookie where express/connect stores its session_id
  secret:       'session_secret',    // the session_secret to parse the cookie
  store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please
  success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
  fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));

function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io');

  // The accept-callback still allows us to decide whether to
  // accept the connection or not.
  accept(null, true);

  // OR

  // If you use socket.io@1.X the callback looks different
  accept();
}

function onAuthorizeFail(data, message, error, accept){
  if(error)
    throw new Error(message);
  console.log('failed connection to socket.io:', message);

  // We use this callback to log all of our failed connections.
  accept(null, false);

  // OR

  // If you use socket.io@1.X the callback looks different
  // If you don't want to accept the connection
  if(error)
    accept(new Error(message));
  // this error will be sent to the user as a special error-package
  // see: http://socket.io/docs/client-api/#socket > error-object
}
```

## passport.socketio - Options

### `store` [function] **required**:
*Always* provide one. If you don't know what sessionStore to use, have a look at [this list](https://github.com/senchalabs/connect/wiki#session-stores).
Also be sure to use the same sessionStore or at least a connection to *the same collection/table/whatever*. And don't forget your `express.session()` middleware:
`app.use(express.session({ store: awesomeSessionStore }));`
For further info about this middleware see [the official documentation](http://www.senchalabs.org/connect/session.html#session).

You can also check the simple example below using a redis store.

```javascript
//in your app.js
var sessionStore = new redisStore();

app.use(session({
  key: 'express.sid',
  store: sessionStore,
  secret: 'keyboard cat'
}));

//in your passport.socketio setup
//With Socket.io >= 1.0 (you will have the same setup for Socket.io <1)
io.use(passportSocketIo.authorize({
  cookieParser: require('cookie-parser'), //optional your cookie-parser middleware function. Defaults to require('cookie-parser')
  key:          'express.sid',       //make sure is the same as in your session settings in app.js
  secret:       'keyboard cat',      //make sure is the same as in your session settings in app.js
  store:        sessionStore,        //you need to use the same sessionStore you defined in the app.use(session({... in app.js
  success:      onAuthorizeSuccess,  // *optional* callback on success
  fail:         onAuthorizeFail,     // *optional* callback on fail/error
}));

```

### `cookieParser` [function] **optional**:
Optional cookieParser from express. Express 3 is `express.cookieParser` in Express 4 `require('cookie-parser')`.

Defaults to `require('cookie-parser')`.

### `key` [string] **optional**:
Defaults to `'connect.sid'`. But you're always better of to be sure and set your own key. Don't forget to also change it in your `express.session()`:
`app.use(express.session({ key: 'your.sid-key' }));`

### `secret` [string] **optional**:
As with `key`, also the secret you provide is optional. *But:* be sure to have one. That's always safer. You can set it like the key:
`app.use(express.session({ secret: 'pinkie ate my cupcakes!' }));`

### `passport` [function] **optional**:
Defaults to `require('passport')`. If you want, you can provide your own instance of passport for whatever reason.

### `success` [function] **optional**:
Callback which will be called everytime a *authorized* user successfuly connects to your socket.io instance. **Always** be sure to accept/reject the connection.
For that, there are two parameters: `function(data[object], accept[function])`. `data` contains all the user-information from passport.
The second parameter is for accepting/rejecting connections. Use it like this if you use socket.io under 1.0:
```javascript
// accept connection
accept(null, true);

// reject connection (for whatever reason)
accept(null, false);


```

And like this if you use the newest version of socket.io@1.X
```javascript
// accept connection
accept();

// reject connection (for whatever reason)
accept(new Error('optional reason'));


```


### `fail` [function] **optional**:
The name of this callback may be a little confusing. While it is called when a not-authorized-user connects, it is also called when there's a error.
For debugging reasons you are provided with two additional parameters `function(data[object], message[string], error[bool], accept[function])`: (socket.io @ < 1.X)
```javascript
/* ... */
function onAuthorizeFail(data, message, error, accept){
  // error indicates whether the fail is due to an error or just a unauthorized client
  if(error){
    throw new Error(message);
  } else {
    console.log(message);
    // the same accept-method as above in the success-callback
    accept(null, false);
  }
}

// or
// This function accepts every client unless there's an error
function onAuthorizeFail(data, message, error, accept){
  console.log(message);
  accept(null, !error);
}
```

Socket.io@1.X:
```javascript
function onAuthorizeFail(data, message, error, accept){
  // error indicates whether the fail is due to an error or just a unauthorized client
  if(error)  throw new Error(message);
  // send the (not-fatal) error-message to the client and deny the connection
  return accept(new Error(message));
}

// or
// This function accepts every client unless there's an critical error
function onAuthorizeFail(data, message, error, accept){
  if(error)  throw new Error(message);
  return accept();
}
```


You can use the `message` parameter for debugging/logging/etc uses.

## `socket.handshake.user` (prior to v1)
This property was removed in v1. See `socket.request.user`

## `socket.request.user` (as of v1)
This property is always available from inside a `io.on('connection')` handler. If the user is authorized via passport, you can access all the properties from there.
**Plus** you have the `socket.request.user.logged_in` property which tells you whether the user is currently authorized or not.

**Note:** This property was named socket.handshake.user prior to v1

## Additional methods

### `passportSocketIo.filterSocketsByUser`
This function gives you the ability to filter all connected sockets via a user property. Needs two parameters `function(io, function(user))`. Example:
```javascript
passportSocketIo.filterSocketsByUser(io, function(user){
  return user.gender === 'female';
}).forEach(function(socket){
  socket.emit('messsage', 'hello, woman!');
});
```

## CORS-Workaround:
If you happen to have to work with Cross-Origin-Requests (marked by socket.io v0.9 as `handshake.xdomain` and by socket.io v1.0 as `request.xdomain`) then here's a workaround:

### Clientside:
You have to provide the session-cookie. If you haven't set a name yet, do it like this: `app.use(express.session({ key: 'your.sid-key' }));`
```javascript
// Note: ther's no readCookie-function built in.
// Get your own in the internetz
socket = io.connect('//' + window.location.host, {
  query: 'session_id=' + readCookie('your.sid-key')
});
```

### Serverside:
Nope, there's nothing to do on the server side. Just be sure that the cookies names match.


## Notes:
* Does **NOT** support cookie-based sessions. eg: `express.cookieSession`
* If the connection fails, check if you are requesting from a client via CORS. Check `socket.handshake.xdomain === true` (`socket.request.xdomain === true` with socket.io v1) as there are no cookies sent. For a workaround look at the code above.


## Contribute
You are always welcome to open an issue or provide a pull-request!
Also check out the unit tests:
```bash
npm test
```

## License
Licensed under the MIT-License.
2012-2013 José F. Romaniello.
