// Displays the visitors chat sessions
// chatWindow - the div that displays the chats
function MaqawChatManager(chatWindow) {
    this.chatWindow = chatWindow;
    this.activeVisitor = undefined;

    // create div for when no chat session is selected
    this.noChatSession = document.createElement('DIV');
    this.noChatSession.id = 'maqaw-no-chat-session-selected';
    this.noChatSession.innerHTML = 'No visitor selected';

    // default to showing noChatSession
    chatWindow.appendChild(this.noChatSession);
}

// Displays a visitors chat session
// visitor - the visitor object whose chat session will be displayed
MaqawChatManager.prototype.showVisitorChat = function(visitor) {
    this.activeVisitor = visitor;
    // reset chat window and then show this visitor's chat session
    this.chatWindow.innerHTML = '';
    this.chatWindow.appendChild(visitor.chatSession.getContainer());
};

// Clears the displayed chat session.
// if a visitor object is passed in, the chat is only cleared if that
// visitor is being displayed. If no argument is passed in then the
// window is always cleared
MaqawChatManager.prototype.clear = function(visitor) {

    if(!visitor || visitor && visitor === this.activeVisitor){
        this.chatWindow.innerHTML = '';
        this.chatWindow.appendChild(this.noChatSession);
    }

};/**
 * Created By: Eli
 * Date: 7/15/13
 */

function MaqawLoginPage(manager) {
    var that = this;
    var loginEndpoint = 'http://54.214.232.157:3000/login';
    var email = 'test@test.com';
    var password = 'test';

    this.maqawManager = manager;
    /* Create elements that make up the login page */
// create login header
    this.header = document.createElement('DIV');
    this.header.className = 'maqaw-default-client-header';
     // add text to header
    this.loginHeader = document.createElement('DIV');
    this.loginHeader.innerHTML = "Login";
    this.loginHeader.className = 'maqaw-chat-header-text';
    this.header.appendChild(this.loginHeader);


// create login window
    this.body = document.createElement('DIV');
    this.body.id = 'maqaw-login-window';

// add title to login window
    var loginTitle;
    loginTitle = document.createElement('DIV');
    loginTitle.id = 'maqaw-login-title';
    loginTitle.innerHTML = 'Login to your account';
    this.body.appendChild(loginTitle);

    // add div for error text
    var errorMessage = document.createElement("DIV");
    errorMessage.id = 'maqaw-login-error-message';
    errorMessage.innerHTML = 'Invalid email or password';
    errorMessage.style.display = 'none';
    this.body.appendChild(errorMessage);

// create login form
    var emailField = document.createElement("input");
    emailField.setAttribute('type', "text");
    emailField.setAttribute('name', "email");
    emailField.setAttribute('id', "maqaw-login-user-field")
    emailField.setAttribute('size', "31");
    emailField.setAttribute('placeholder', 'email');
    //emailField.value = email;
    this.body.appendChild(emailField);

    var passwordField = document.createElement("input");
    passwordField.setAttribute('type', "password");
    passwordField.setAttribute('name', "password");
    passwordField.setAttribute('id', "maqaw-login-password-field");
    passwordField.setAttribute('placeholder', 'password');
    //passwordField.value = password;
    this.body.appendChild(passwordField);

// submit button
    var loginSubmitButton = document.createElement('DIV');
    loginSubmitButton.id = 'maqaw-login-submit-button';
    loginSubmitButton.className = 'maqaw-login-page-button';
    loginSubmitButton.innerHTML = 'Login';
    this.body.appendChild(loginSubmitButton);

// set up submit button listener
    loginSubmitButton.addEventListener('click', submitLoginCredentials, false);

// back button
    var loginBackButton = document.createElement('DIV');
    loginBackButton.id = 'maqaw-login-back-button';
    loginBackButton.className = 'maqaw-login-page-button';
    loginBackButton.innerHTML = 'Back';
    this.body.appendChild(loginBackButton);

// set up back button listener
    loginBackButton.addEventListener('click', this.maqawManager.showVisitorSession, false);

// add login footer text
    var loginFooter = document.createElement('DIV');
    loginFooter.id = 'maqaw-login-footer';
    loginFooter.innerHTML = "Don't have an account? Sign up at <a href='http://maqaw.com'>Maqaw.com</a>!";
    this.body.appendChild(loginFooter);

    function submitLoginCredentials() {
        var key = that.maqawManager.key;
        var id = that.maqawManager.id;
        var email = emailField.value;
        var password = passwordField.value;

        var params = encodeURI('email='+email+'&password='+password+'&user[id]='+id+'&user[key]='+key);

        // store a cookie with this login data, so the rep can reload the page without logging in again
        // the cookie has no expiration date set, so it will be cleared when the browser is closed
        maqawCookies.setItem('maqawRepLoginCookie', params);

        // submit post request
        maqawAjaxPost(loginEndpoint, params, handleLoginPostResponse);
    }

    function handleLoginPostResponse(xhr) {
        // if credentials were denied show error message
        if(xhr.status === 401) {
            errorMessage.style.display = 'block';
            // clear stored params

            maqawCookies.removeItem('maqawRepLoginCookie');
        } else if(xhr.status === 200) {
            // success! hide error message
            errorMessage.style.display = 'none';
            // create new MaqawRepresentative object with response data
            var rep = new MaqawRepresentative('RepName');
            // tell manager to change to rep mode using our representative data
            that.maqawManager.startNewRepSession(rep);
            that.loginSuccess = true;
        }
    }

    // attempts a login with the supplied parameters
    this.loginWithParams = function(params){
        that.loginSuccess = false;
        var retryRate = 100;
        var maxAttempts = 10;
        var numAttempts = 0;

        (function tryLogin(){
            maqawAjaxPost(loginEndpoint, params, handleLoginPostResponse);
            numAttempts++
            if(!that.loginSuccess && numAttempts < maxAttempts){
                setTimeout(tryLogin, retryRate);
            } else if (numAttempts >= maxAttempts){
                that.maqawManager.showVisitorSession();
            }
        })();
    }
}

MaqawLoginPage.prototype.getBodyContents = function () {
    return this.body;
};

MaqawLoginPage.prototype.getHeaderContents = function () {
    return this.header;
};/*! peerjs.js build:0.2.8, development. Copyright(c) 2013 Michelle Bu <michelle@michellebu.com> */
(function(exports){
var binaryFeatures = {};
binaryFeatures.useBlobBuilder = (function(){
  try {
    new Blob([]);
    return false;
  } catch (e) {
    return true;
  }
})();

binaryFeatures.useArrayBufferView = !binaryFeatures.useBlobBuilder && (function(){
  try {
    return (new Blob([new Uint8Array([])])).size === 0;
  } catch (e) {
    return true;
  }
})();

exports.binaryFeatures = binaryFeatures;
exports.BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder || window.BlobBuilder;

function BufferBuilder(){
  this._pieces = [];
  this._parts = [];
}

BufferBuilder.prototype.append = function(data) {
  if(typeof data === 'number') {
    this._pieces.push(data);
  } else {
    this._flush();
    this._parts.push(data);
  }
};

BufferBuilder.prototype._flush = function() {
  if (this._pieces.length > 0) {    
    var buf = new Uint8Array(this._pieces);
    if(!binaryFeatures.useArrayBufferView) {
      buf = buf.buffer;
    }
    this._parts.push(buf);
    this._pieces = [];
  }
};

BufferBuilder.prototype.getBuffer = function() {
  this._flush();
  if(binaryFeatures.useBlobBuilder) {
    var builder = new BlobBuilder();
    for(var i = 0, ii = this._parts.length; i < ii; i++) {
      builder.append(this._parts[i]);
    }
    return builder.getBlob();
  } else {
    return new Blob(this._parts);
  }
};
exports.BinaryPack = {
  unpack: function(data){
    var unpacker = new Unpacker(data);
    return unpacker.unpack();
  },
  pack: function(data, utf8){
    var packer = new Packer(utf8);
    var buffer = packer.pack(data);
    return buffer;
  }
};

function Unpacker (data){
  // Data is ArrayBuffer
  this.index = 0;
  this.dataBuffer = data;
  this.dataView = new Uint8Array(this.dataBuffer);
  this.length = this.dataBuffer.byteLength;
}


Unpacker.prototype.unpack = function(){
  var type = this.unpack_uint8();
  if (type < 0x80){
    var positive_fixnum = type;
    return positive_fixnum;
  } else if ((type ^ 0xe0) < 0x20){
    var negative_fixnum = (type ^ 0xe0) - 0x20;
    return negative_fixnum;
  }
  var size;
  if ((size = type ^ 0xa0) <= 0x0f){
    return this.unpack_raw(size);
  } else if ((size = type ^ 0xb0) <= 0x0f){
    return this.unpack_string(size);
  } else if ((size = type ^ 0x90) <= 0x0f){
    return this.unpack_array(size);
  } else if ((size = type ^ 0x80) <= 0x0f){
    return this.unpack_map(size);
  }
  switch(type){
    case 0xc0:
      return null;
    case 0xc1:
      return undefined;
    case 0xc2:
      return false;
    case 0xc3:
      return true;
    case 0xca:
      return this.unpack_float();
    case 0xcb:
      return this.unpack_double();
    case 0xcc:
      return this.unpack_uint8();
    case 0xcd:
      return this.unpack_uint16();
    case 0xce:
      return this.unpack_uint32();
    case 0xcf:
      return this.unpack_uint64();
    case 0xd0:
      return this.unpack_int8();
    case 0xd1:
      return this.unpack_int16();
    case 0xd2:
      return this.unpack_int32();
    case 0xd3:
      return this.unpack_int64();
    case 0xd4:
      return undefined;
    case 0xd5:
      return undefined;
    case 0xd6:
      return undefined;
    case 0xd7:
      return undefined;
    case 0xd8:
      size = this.unpack_uint16();
      return this.unpack_string(size);
    case 0xd9:
      size = this.unpack_uint32();
      return this.unpack_string(size);
    case 0xda:
      size = this.unpack_uint16();
      return this.unpack_raw(size);
    case 0xdb:
      size = this.unpack_uint32();
      return this.unpack_raw(size);
    case 0xdc:
      size = this.unpack_uint16();
      return this.unpack_array(size);
    case 0xdd:
      size = this.unpack_uint32();
      return this.unpack_array(size);
    case 0xde:
      size = this.unpack_uint16();
      return this.unpack_map(size);
    case 0xdf:
      size = this.unpack_uint32();
      return this.unpack_map(size);
  }
}

Unpacker.prototype.unpack_uint8 = function(){
  var _byte = this.dataView[this.index] & 0xff;
  this.index++;
  return _byte;
};

Unpacker.prototype.unpack_uint16 = function(){
  var bytes = this.read(2);
  var uint16 =
    ((bytes[0] & 0xff) * 256) + (bytes[1] & 0xff);
  this.index += 2;
  return uint16;
}

Unpacker.prototype.unpack_uint32 = function(){
  var bytes = this.read(4);
  var uint32 =
     ((bytes[0]  * 256 +
       bytes[1]) * 256 +
       bytes[2]) * 256 +
       bytes[3];
  this.index += 4;
  return uint32;
}

Unpacker.prototype.unpack_uint64 = function(){
  var bytes = this.read(8);
  var uint64 =
   ((((((bytes[0]  * 256 +
       bytes[1]) * 256 +
       bytes[2]) * 256 +
       bytes[3]) * 256 +
       bytes[4]) * 256 +
       bytes[5]) * 256 +
       bytes[6]) * 256 +
       bytes[7];
  this.index += 8;
  return uint64;
}


Unpacker.prototype.unpack_int8 = function(){
  var uint8 = this.unpack_uint8();
  return (uint8 < 0x80 ) ? uint8 : uint8 - (1 << 8);
};

Unpacker.prototype.unpack_int16 = function(){
  var uint16 = this.unpack_uint16();
  return (uint16 < 0x8000 ) ? uint16 : uint16 - (1 << 16);
}

Unpacker.prototype.unpack_int32 = function(){
  var uint32 = this.unpack_uint32();
  return (uint32 < Math.pow(2, 31) ) ? uint32 :
    uint32 - Math.pow(2, 32);
}

Unpacker.prototype.unpack_int64 = function(){
  var uint64 = this.unpack_uint64();
  return (uint64 < Math.pow(2, 63) ) ? uint64 :
    uint64 - Math.pow(2, 64);
}

Unpacker.prototype.unpack_raw = function(size){
  if ( this.length < this.index + size){
    throw new Error('BinaryPackFailure: index is out of range'
      + ' ' + this.index + ' ' + size + ' ' + this.length);
  }
  var buf = this.dataBuffer.slice(this.index, this.index + size);
  this.index += size;
  
    //buf = util.bufferToString(buf);
  
  return buf;
}

Unpacker.prototype.unpack_string = function(size){
  var bytes = this.read(size);
  var i = 0, str = '', c, code;
  while(i < size){
    c = bytes[i];
    if ( c < 128){
      str += String.fromCharCode(c);
      i++;
    } else if ((c ^ 0xc0) < 32){
      code = ((c ^ 0xc0) << 6) | (bytes[i+1] & 63);
      str += String.fromCharCode(code);
      i += 2;
    } else {
      code = ((c & 15) << 12) | ((bytes[i+1] & 63) << 6) |
        (bytes[i+2] & 63);
      str += String.fromCharCode(code);
      i += 3;
    }
  }
  this.index += size;
  return str;
}

Unpacker.prototype.unpack_array = function(size){
  var objects = new Array(size);
  for(var i = 0; i < size ; i++){
    objects[i] = this.unpack();
  }
  return objects;
}

Unpacker.prototype.unpack_map = function(size){
  var map = {};
  for(var i = 0; i < size ; i++){
    var key  = this.unpack();
    var value = this.unpack();
    map[key] = value;
  }
  return map;
}

Unpacker.prototype.unpack_float = function(){
  var uint32 = this.unpack_uint32();
  var sign = uint32 >> 31;
  var exp  = ((uint32 >> 23) & 0xff) - 127;
  var fraction = ( uint32 & 0x7fffff ) | 0x800000;
  return (sign == 0 ? 1 : -1) *
    fraction * Math.pow(2, exp - 23);
}

Unpacker.prototype.unpack_double = function(){
  var h32 = this.unpack_uint32();
  var l32 = this.unpack_uint32();
  var sign = h32 >> 31;
  var exp  = ((h32 >> 20) & 0x7ff) - 1023;
  var hfrac = ( h32 & 0xfffff ) | 0x100000;
  var frac = hfrac * Math.pow(2, exp - 20) +
    l32   * Math.pow(2, exp - 52);
  return (sign == 0 ? 1 : -1) * frac;
}

Unpacker.prototype.read = function(length){
  var j = this.index;
  if (j + length <= this.length) {
    return this.dataView.subarray(j, j + length);
  } else {
    throw new Error('BinaryPackFailure: read index out of range');
  }
}
  
function Packer(utf8){
  this.utf8 = utf8;
  this.bufferBuilder = new BufferBuilder();
}

Packer.prototype.pack = function(value){
  var type = typeof(value);
  if (type == 'string'){
    this.pack_string(value);
  } else if (type == 'number'){
    if (Math.floor(value) === value){
      this.pack_integer(value);
    } else{
      this.pack_double(value);
    }
  } else if (type == 'boolean'){
    if (value === true){
      this.bufferBuilder.append(0xc3);
    } else if (value === false){
      this.bufferBuilder.append(0xc2);
    }
  } else if (type == 'undefined'){
    this.bufferBuilder.append(0xc0);
  } else if (type == 'object'){
    if (value === null){
      this.bufferBuilder.append(0xc0);
    } else {
      var constructor = value.constructor;
      if (constructor == Array){
        this.pack_array(value);
      } else if (constructor == Blob || constructor == File) {
        this.pack_bin(value);
      } else if (constructor == ArrayBuffer) {
        if(binaryFeatures.useArrayBufferView) {
          this.pack_bin(new Uint8Array(value));
        } else {
          this.pack_bin(value);
        }
      } else if ('BYTES_PER_ELEMENT' in value){
        if(binaryFeatures.useArrayBufferView) {
          this.pack_bin(value);
        } else {
          this.pack_bin(value.buffer);
        }
      } else if (constructor == Object){
        this.pack_object(value);
      } else if (constructor == Date){
        this.pack_string(value.toString());
      } else if (typeof value.toBinaryPack == 'function'){
        this.bufferBuilder.append(value.toBinaryPack());
      } else {
        throw new Error('Type "' + constructor.toString() + '" not yet supported');
      }
    }
  } else {
    throw new Error('Type "' + type + '" not yet supported');
  }
  return this.bufferBuilder.getBuffer();
}


Packer.prototype.pack_bin = function(blob){
  var length = blob.length || blob.byteLength || blob.size;
  if (length <= 0x0f){
    this.pack_uint8(0xa0 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xda) ;
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xdb);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
    return;
  }
  this.bufferBuilder.append(blob);
}

Packer.prototype.pack_string = function(str){
  var length;
  if (this.utf8) {
    var blob = new Blob([str]);
    length = blob.size;
  } else {
    length = str.length;
  }
  if (length <= 0x0f){
    this.pack_uint8(0xb0 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xd8) ;
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xd9);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
    return;
  }
  this.bufferBuilder.append(str);
}

Packer.prototype.pack_array = function(ary){
  var length = ary.length;
  if (length <= 0x0f){
    this.pack_uint8(0x90 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xdc)
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xdd);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
  }
  for(var i = 0; i < length ; i++){
    this.pack(ary[i]);
  }
}

Packer.prototype.pack_integer = function(num){
  if ( -0x20 <= num && num <= 0x7f){
    this.bufferBuilder.append(num & 0xff);
  } else if (0x00 <= num && num <= 0xff){
    this.bufferBuilder.append(0xcc);
    this.pack_uint8(num);
  } else if (-0x80 <= num && num <= 0x7f){
    this.bufferBuilder.append(0xd0);
    this.pack_int8(num);
  } else if ( 0x0000 <= num && num <= 0xffff){
    this.bufferBuilder.append(0xcd);
    this.pack_uint16(num);
  } else if (-0x8000 <= num && num <= 0x7fff){
    this.bufferBuilder.append(0xd1);
    this.pack_int16(num);
  } else if ( 0x00000000 <= num && num <= 0xffffffff){
    this.bufferBuilder.append(0xce);
    this.pack_uint32(num);
  } else if (-0x80000000 <= num && num <= 0x7fffffff){
    this.bufferBuilder.append(0xd2);
    this.pack_int32(num);
  } else if (-0x8000000000000000 <= num && num <= 0x7FFFFFFFFFFFFFFF){
    this.bufferBuilder.append(0xd3);
    this.pack_int64(num);
  } else if (0x0000000000000000 <= num && num <= 0xFFFFFFFFFFFFFFFF){
    this.bufferBuilder.append(0xcf);
    this.pack_uint64(num);
  } else{
    throw new Error('Invalid integer');
  }
}

Packer.prototype.pack_double = function(num){
  var sign = 0;
  if (num < 0){
    sign = 1;
    num = -num;
  }
  var exp  = Math.floor(Math.log(num) / Math.LN2);
  var frac0 = num / Math.pow(2, exp) - 1;
  var frac1 = Math.floor(frac0 * Math.pow(2, 52));
  var b32   = Math.pow(2, 32);
  var h32 = (sign << 31) | ((exp+1023) << 20) |
      (frac1 / b32) & 0x0fffff;
  var l32 = frac1 % b32;
  this.bufferBuilder.append(0xcb);
  this.pack_int32(h32);
  this.pack_int32(l32);
}

Packer.prototype.pack_object = function(obj){
  var keys = Object.keys(obj);
  var length = keys.length;
  if (length <= 0x0f){
    this.pack_uint8(0x80 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xde);
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xdf);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
  }
  for(var prop in obj){
    if (obj.hasOwnProperty(prop)){
      this.pack(prop);
      this.pack(obj[prop]);
    }
  }
}

Packer.prototype.pack_uint8 = function(num){
  this.bufferBuilder.append(num);
}

Packer.prototype.pack_uint16 = function(num){
  this.bufferBuilder.append(num >> 8);
  this.bufferBuilder.append(num & 0xff);
}

Packer.prototype.pack_uint32 = function(num){
  var n = num & 0xffffffff;
  this.bufferBuilder.append((n & 0xff000000) >>> 24);
  this.bufferBuilder.append((n & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((n & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((n & 0x000000ff));
}

Packer.prototype.pack_uint64 = function(num){
  var high = num / Math.pow(2, 32);
  var low  = num % Math.pow(2, 32);
  this.bufferBuilder.append((high & 0xff000000) >>> 24);
  this.bufferBuilder.append((high & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((high & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((high & 0x000000ff));
  this.bufferBuilder.append((low  & 0xff000000) >>> 24);
  this.bufferBuilder.append((low  & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((low  & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((low  & 0x000000ff));
}

Packer.prototype.pack_int8 = function(num){
  this.bufferBuilder.append(num & 0xff);
}

Packer.prototype.pack_int16 = function(num){
  this.bufferBuilder.append((num & 0xff00) >> 8);
  this.bufferBuilder.append(num & 0xff);
}

Packer.prototype.pack_int32 = function(num){
  this.bufferBuilder.append((num >>> 24) & 0xff);
  this.bufferBuilder.append((num & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((num & 0x0000ff00) >>> 8);
  this.bufferBuilder.append((num & 0x000000ff));
}

Packer.prototype.pack_int64 = function(num){
  var high = Math.floor(num / Math.pow(2, 32));
  var low  = num % Math.pow(2, 32);
  this.bufferBuilder.append((high & 0xff000000) >>> 24);
  this.bufferBuilder.append((high & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((high & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((high & 0x000000ff));
  this.bufferBuilder.append((low  & 0xff000000) >>> 24);
  this.bufferBuilder.append((low  & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((low  & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((low  & 0x000000ff));
}
/**
 * Light EventEmitter. Ported from Node.js/events.js
 * Eric Zhang
 */

/**
 * EventEmitter class
 * Creates an object with event registering and firing methods
 */
function EventEmitter() {
  // Initialise required storage variables
  this._events = {};
}

var isArray = Array.isArray;


EventEmitter.prototype.addListener = function(type, listener, scope, once) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }
  
  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, typeof listener.listener === 'function' ?
            listener.listener : listener);
            
  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // If we've already got an array, just append.
    this._events[type].push(listener);

  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }
  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener, scope) {
  if ('function' !== typeof listener) {
    throw new Error('.once only takes instances of Function');
  }

  var self = this;
  function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  };

  g.listener = listener;
  self.on(type, g);

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener, scope) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var position = -1;
    for (var i = 0, length = list.length; i < length; i++) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener))
      {
        position = i;
        break;
      }
    }

    if (position < 0) return this;
    list.splice(position, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (list === listener ||
             (list.listener && list.listener === listener))
  {
    delete this._events[type];
  }

  return this;
};


EventEmitter.prototype.off = EventEmitter.prototype.removeListener;


EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

EventEmitter.prototype.emit = function(type) {
  var type = arguments[0];
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var l = arguments.length;
        var args = new Array(l - 1);
        for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var l = arguments.length;
    var args = new Array(l - 1);
    for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;
  } else {
    return false;
  }
};



var util = {

  chromeCompatible: true,
  firefoxCompatible: true,
  chromeVersion: 26,
  firefoxVersion: 22,

  debug: false,
  browserisms: '',

  inherits: function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  },
  extend: function(dest, source) {
    for(var key in source) {
      if(source.hasOwnProperty(key)) {
        dest[key] = source[key];
      }
    }
    return dest;
  },
  pack: BinaryPack.pack,
  unpack: BinaryPack.unpack,

  log: function () {
    if (util.debug) {
      var err = false;
      var copy = Array.prototype.slice.call(arguments);
      copy.unshift('PeerJS: ');
      for (var i = 0, l = copy.length; i < l; i++){
        if (copy[i] instanceof Error) {
          copy[i] = '(' + copy[i].name + ') ' + copy[i].message;
          err = true;
        }
      }
      err ? console.error.apply(console, copy) : console.log.apply(console, copy);
    }
  },

  setZeroTimeout: (function(global) {
    var timeouts = [];
    var messageName = 'zero-timeout-message';

    // Like setTimeout, but only takes a function argument.	 There's
    // no time argument (always zero) and no arguments (you have to
    // use a closure).
    function setZeroTimeoutPostMessage(fn) {
      timeouts.push(fn);
      global.postMessage(messageName, '*');
    }

    function handleMessage(event) {
      if (event.source == global && event.data == messageName) {
        if (event.stopPropagation) {
          event.stopPropagation();
        }
        if (timeouts.length) {
          timeouts.shift()();
        }
      }
    }
    if (global.addEventListener) {
      global.addEventListener('message', handleMessage, true);
    } else if (global.attachEvent) {
      global.attachEvent('onmessage', handleMessage);
    }
    return setZeroTimeoutPostMessage;
  }(this)),

  blobToArrayBuffer: function(blob, cb){
    var fr = new FileReader();
    fr.onload = function(evt) {
      cb(evt.target.result);
    };
    fr.readAsArrayBuffer(blob);
  },
  blobToBinaryString: function(blob, cb){
    var fr = new FileReader();
    fr.onload = function(evt) {
      cb(evt.target.result);
    };
    fr.readAsBinaryString(blob);
  },
  binaryStringToArrayBuffer: function(binary) {
    var byteArray = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      byteArray[i] = binary.charCodeAt(i) & 0xff;
    }
    return byteArray.buffer;
  },
  randomToken: function () {
    return Math.random().toString(36).substr(2);
  },
  isBrowserCompatible: function() {
    var c, f;
    if (this.chromeCompatible) {
      if ((c = navigator.userAgent.split('Chrome/')) && c.length > 1) {
        // Get version #.
        var v = c[1].split('.')[0];
        return parseInt(v) >= this.chromeVersion;
      }
    }
    if (this.firefoxCompatible) {
      if ((f = navigator.userAgent.split('Firefox/')) && f.length > 1) {
        // Get version #.
        var v = f[1].split('.')[0];
        return parseInt(v) >= this.firefoxVersion;
      }
    }
    return false;
  },
  isSecure: function() {
    return location.protocol === 'https:';
  }
};
/**
 * Reliable transfer for Chrome Canary DataChannel impl.
 * Author: @michellebu
 */
function Reliable(dc, debug) {
  if (!(this instanceof Reliable)) return new Reliable(dc);
  this._dc = dc;

  util.debug = debug;

  // Messages sent/received so far.
  // id: { ack: n, chunks: [...] }
  this._outgoing = {};
  // id: { ack: ['ack', id, n], chunks: [...] }
  this._incoming = {};
  this._received = {};

  // Window size.
  this._window = 1000;
  // MTU.
  this._mtu = 500;
  // Interval for setInterval. In ms.
  this._interval = 0;

  // Messages sent.
  this._count = 0;

  // Outgoing message queue.
  this._queue = [];

  this._setupDC();
};

// Send a message reliably.
Reliable.prototype.send = function(msg) {
  // Determine if chunking is necessary.
  var bl = util.pack(msg);
  if (bl.size < this._mtu) {
    this._handleSend(['no', bl]);
    return;
  }

  this._outgoing[this._count] = {
    ack: 0,
    chunks: this._chunk(bl)
  };

  if (util.debug) {
    this._outgoing[this._count].timer = new Date();
  }

  // Send prelim window.
  this._sendWindowedChunks(this._count);
  this._count += 1;
};

// Set up interval for processing queue.
Reliable.prototype._setupInterval = function() {
  // TODO: fail gracefully.

  var self = this;
  this._timeout = setInterval(function() {
    // FIXME: String stuff makes things terribly async.
    var msg = self._queue.shift();
    if (msg._multiple) {
      for (var i = 0, ii = msg.length; i < ii; i += 1) {
        self._intervalSend(msg[i]);
      }
    } else {
      self._intervalSend(msg);
    }
  }, this._interval);
};

Reliable.prototype._intervalSend = function(msg) {
  var self = this;
  msg = util.pack(msg);
  util.blobToBinaryString(msg, function(str) {
    self._dc.send(str);
  });
  if (self._queue.length === 0) {
    clearTimeout(self._timeout);
    self._timeout = null;
    //self._processAcks();
  }
};

// Go through ACKs to send missing pieces.
Reliable.prototype._processAcks = function() {
  for (var id in this._outgoing) {
    if (this._outgoing.hasOwnProperty(id)) {
      this._sendWindowedChunks(id);
    }
  }
};

// Handle sending a message.
// FIXME: Don't wait for interval time for all messages...
Reliable.prototype._handleSend = function(msg) {
  var push = true;
  for (var i = 0, ii = this._queue.length; i < ii; i += 1) {
    var item = this._queue[i];
    if (item === msg) {
      push = false;
    } else if (item._multiple && item.indexOf(msg) !== -1) {
      push = false;
    }
  }
  if (push) {
    this._queue.push(msg);
    if (!this._timeout) {
      this._setupInterval();
    }
  }
};

// Set up DataChannel handlers.
Reliable.prototype._setupDC = function() {
  // Handle various message types.
  var self = this;
  this._dc.onmessage = function(e) {
    var msg = e.data;
    var datatype = msg.constructor;
    // FIXME: msg is String until binary is supported.
    // Once that happens, this will have to be smarter.
    if (datatype === String) {
      var ab = util.binaryStringToArrayBuffer(msg);
      msg = util.unpack(ab);
      self._handleMessage(msg);
    }
  };
};

// Handles an incoming message.
Reliable.prototype._handleMessage = function(msg) {
  var id = msg[1];
  var idata = this._incoming[id];
  var odata = this._outgoing[id];
  var data;
  switch (msg[0]) {
    // No chunking was done.
    case 'no':
      var message = id;
      if (!!message) {
        this.onmessage(util.unpack(message));
      }
      break;
    // Reached the end of the message.
    case 'end':
      data = idata;

      // In case end comes first.
      this._received[id] = msg[2];

      if (!data) {
        break;
      }

      this._ack(id);
      break;
    case 'ack':
      data = odata;
      if (!!data) {
        var ack = msg[2];
        // Take the larger ACK, for out of order messages.
        data.ack = Math.max(ack, data.ack);

        // Clean up when all chunks are ACKed.
        if (data.ack >= data.chunks.length) {
          util.log('Time: ', new Date() - data.timer);
          delete this._outgoing[id];
        } else {
          this._processAcks();
        }
      }
      // If !data, just ignore.
      break;
    // Received a chunk of data.
    case 'chunk':
      // Create a new entry if none exists.
      data = idata;
      if (!data) {
        var end = this._received[id];
        if (end === true) {
          break;
        }
        data = {
          ack: ['ack', id, 0],
          chunks: []
        };
        this._incoming[id] = data;
      }

      var n = msg[2];
      var chunk = msg[3];
      data.chunks[n] = new Uint8Array(chunk);

      // If we get the chunk we're looking for, ACK for next missing.
      // Otherwise, ACK the same N again.
      if (n === data.ack[2]) {
        this._calculateNextAck(id);
      }
      this._ack(id);
      break;
    default:
      // Shouldn't happen, but would make sense for message to just go
      // through as is.
      this._handleSend(msg);
      break;
  }
};

// Chunks BL into smaller messages.
Reliable.prototype._chunk = function(bl) {
  var chunks = [];
  var size = bl.size;
  var start = 0;
  while (start < size) {
    var end = Math.min(size, start + this._mtu);
    var b = bl.slice(start, end);
    var chunk = {
      payload: b
    }
    chunks.push(chunk);
    start = end;
  }
  util.log('Created', chunks.length, 'chunks.');
  return chunks;
};

// Sends ACK N, expecting Nth blob chunk for message ID.
Reliable.prototype._ack = function(id) {
  var ack = this._incoming[id].ack;

  // if ack is the end value, then call _complete.
  if (this._received[id] === ack[2]) {
    this._complete(id);
    this._received[id] = true;
  }

  this._handleSend(ack);
};

// Calculates the next ACK number, given chunks.
Reliable.prototype._calculateNextAck = function(id) {
  var data = this._incoming[id];
  var chunks = data.chunks;
  for (var i = 0, ii = chunks.length; i < ii; i += 1) {
    // This chunk is missing!!! Better ACK for it.
    if (chunks[i] === undefined) {
      data.ack[2] = i;
      return;
    }
  }
  data.ack[2] = chunks.length;
};

// Sends the next window of chunks.
Reliable.prototype._sendWindowedChunks = function(id) {
  util.log('sendWindowedChunks for: ', id);
  var data = this._outgoing[id];
  var ch = data.chunks;
  var chunks = [];
  var limit = Math.min(data.ack + this._window, ch.length);
  for (var i = data.ack; i < limit; i += 1) {
    if (!ch[i].sent || i === data.ack) {
      ch[i].sent = true;
      chunks.push(['chunk', id, i, ch[i].payload]);
    }
  }
  if (data.ack + this._window >= ch.length) {
    chunks.push(['end', id, ch.length])
  }
  chunks._multiple = true;
  this._handleSend(chunks);
};

// Puts together a message from chunks.
Reliable.prototype._complete = function(id) {
  util.log('Completed called for', id);
  var self = this;
  var chunks = this._incoming[id].chunks;
  var bl = new Blob(chunks);
  util.blobToArrayBuffer(bl, function(ab) {
    self.onmessage(util.unpack(ab));
  });
  delete this._incoming[id];
};

// Ups bandwidth limit on SDP. Meant to be called during offer/answer.
Reliable.higherBandwidthSDP = function(sdp) {
  // AS stands for Application-Specific Maximum.
  // Bandwidth number is in kilobits / sec.
  // See RFC for more info: http://www.ietf.org/rfc/rfc2327.txt
  var parts = sdp.split('b=AS:30');
  var replace = 'b=AS:102400'; // 100 Mbps
  return parts[0] + replace + parts[1];
};

// Overwritten, typically.
Reliable.prototype.onmessage = function(msg) {};

exports.Reliable = Reliable;
if (window.mozRTCPeerConnection) {
  util.browserisms = 'Firefox';
} else if (window.webkitRTCPeerConnection) {
  util.browserisms = 'Webkit';
} else {
  util.browserisms = 'Unknown';
}

exports.RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
exports.RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;
/**
 * A peer who can initiate connections with other peers.
 */
function Peer(id, options) {
  if (id && id.constructor == Object) {
    options = id;
    id = undefined;
  }
  if (!(this instanceof Peer)) return new Peer(id, options);
  EventEmitter.call(this);


  options = util.extend({
    debug: false,
    host: '0.peerjs.com',
    port: 9000,
    key: 'peerjs',
    config: { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] }
  }, options);
  this._options = options;
  util.debug = options.debug;

  // First check if browser can use PeerConnection/DataChannels.
  // TODO: when media is supported, lower browser version limit and move DC
  // check to where`connect` is called.
  var self = this;
  if (!util.isBrowserCompatible()) {
    util.setZeroTimeout(function() {
      self._abort('browser-incompatible', 'The current browser does not support WebRTC DataChannels');
    });
    return;
  }

  // Detect relative URL host.
  if (options.host === '/') {
    options.host = window.location.hostname;
  }

  // Ensure alphanumeric_-
  if (id && !/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(id)) {
    util.setZeroTimeout(function() {
      self._abort('invalid-id', 'ID "' + id + '" is invalid');
    });
    return;
  }
  if (options.key && !/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(options.key)) {
    util.setZeroTimeout(function() {
      self._abort('invalid-key', 'API KEY "' + options.key + '" is invalid');
    });
    return;
  }

  this._secure = util.isSecure();
  // Errors for now because no support for SSL on cloud server.
  if (this._secure && options.host === '0.peerjs.com') {
    util.setZeroTimeout(function() {
      self._abort('ssl-unavailable',
        'The cloud server currently does not support HTTPS. Please run your own PeerServer to use HTTPS.');
    });
    return;
  }

  // States.
  this.destroyed = false;
  this.disconnected = false;

  // Connections for this peer.
  this.connections = {};
  // Connection managers.
  this.managers = {};

  // Queued connections to make.
  this._queued = [];

  // Init immediately if ID is given, otherwise ask server for ID
  if (id) {
    this.id = id;
    this._init();
  } else {
    this.id = null;
    this._retrieveId();
  }
};

util.inherits(Peer, EventEmitter);

Peer.prototype._retrieveId = function(cb) {
  var self = this;
  try {
    var http = new XMLHttpRequest();
    var protocol = this._secure ? 'https://' : 'http://';
    var url = protocol + this._options.host + ':' + this._options.port + '/' + this._options.key + '/id';
    var queryString = '?ts=' + new Date().getTime() + '' + Math.random();
    url += queryString;
    // If there's no ID we need to wait for one before trying to init socket.
    http.open('get', url, true);
    http.onreadystatechange = function() {
      if (http.readyState === 4) {
        if (http.status !== 200) {
          throw 'Retrieve ID response not 200';
          return;
        }
        self.id = http.responseText;
        self._init();
      }
    };
    http.send(null);
  } catch(e) {
    this._abort('server-error', 'Could not get an ID from the server');
  }
};


Peer.prototype._init = function() {
  var self = this;
  this._socket = new Socket(this._options.host, this._options.port, this._options.key, this.id);
  this._socket.on('message', function(data) {
    self._handleServerJSONMessage(data);
  });
  this._socket.on('error', function(error) {
    util.log(error);
    self._abort('socket-error', error);
  });
  this._socket.on('close', function() {
    var msg = 'Underlying socket has closed';
    util.log('error', msg);
    self._abort('socket-closed', msg);
  });
  this._socket.start();
}


Peer.prototype._handleServerJSONMessage = function(message) {
  var peer = message.src;
  var manager = this.managers[peer];
  var payload = message.payload;
  switch (message.type) {
    case 'OPEN':
      this._processQueue();
      this.emit('open', this.id);
      break;
    case 'ERROR':
      this._abort('server-error', payload.msg);
      break;
    case 'ID-TAKEN':
      this._abort('unavailable-id', 'ID `'+this.id+'` is taken');
      break;
    case 'OFFER':
      var options = {
        sdp: payload.sdp,
        labels: payload.labels,
        config: this._options.config
      };

      var manager = this.managers[peer];
      if (!manager) {
        manager = new ConnectionManager(this.id, peer, this._socket, options);
        this._attachManagerListeners(manager);
        this.managers[peer] = manager;
        this.connections[peer] = manager.connections;
      }
      manager.update(options.labels);
      manager.handleSDP(payload.sdp, message.type);
      break;
    case 'EXPIRE':
      if (manager) {
        manager.close();
        manager.emit('error', new Error('Could not connect to peer ' + manager.peer));
      }
      break;
    case 'ANSWER':
      if (manager) {
        manager.handleSDP(payload.sdp, message.type);
      }
      break;
    case 'CANDIDATE':
      if (manager) {
        manager.handleCandidate(payload);
      }
      break;
    case 'LEAVE':
      if (manager) {
        manager.handleLeave();
      }
      break;
    case 'REPRESENTATIVES':
      this.emit('representatives', payload);
      break;
    case 'CLIENTS':
      this.emit('clients', payload);
      break;
    case 'INVALID-KEY':
      this._abort('invalid-key', 'API KEY "' + this._key + '" is invalid');
      break;
    default:
      util.log('Unrecognized message type:', message.type);
      break;
  }
};

/** Process queued calls to connect. */
Peer.prototype._processQueue = function() {
  while (this._queued.length > 0) {
    var manager = this._queued.pop();
    manager.initialize(this.id, this._socket);
  }
};

/** Listeners for manager. */
Peer.prototype._attachManagerListeners = function(manager) {
  var self = this;
  // Handle receiving a connection.
  manager.on('connection', function(connection) {
    self.emit('connection', connection);
  });
  // Handle a connection closing.
  manager.on('close', function() {
    if (!!self.managers[manager.peer]) {
      delete self.managers[manager.peer];
      delete self.connections[manager.peer];
    }
  });
  manager.on('error', function(err) {
    self.emit('error', err);
  });
};

/** Destroys the Peer and emits an error message. */
Peer.prototype._abort = function(type, message) {
  util.log('Aborting. Error:', message);
  var err = new Error(message);
  err.type = type;
  this.destroy();
  this.emit('error', err);
};

Peer.prototype._cleanup = function() {
  var self = this;
  if (!!this.managers) {
    var peers = Object.keys(this.managers);
    for (var i = 0, ii = peers.length; i < ii; i++) {
      this.managers[peers[i]].close();
    }
  }
  util.setZeroTimeout(function(){
    self.disconnect();
  });
  this.emit('close');
};


/** Exposed connect function for users. Will try to connect later if user
 * is waiting for an ID. */
Peer.prototype.connect = function(peer, options) {
  if (this.disconnected) {
    var err = new Error('This Peer has been disconnected from the server and can no longer make connections.');
    err.type = 'server-disconnected';
    this.emit('error', err);
    return;
  }

  options = util.extend({
    config: this._options.config
  }, options);

  var manager = this.managers[peer];

  // Firefox currently does not support multiplexing once an offer is made.
  if (util.browserisms === 'Firefox' && !!manager && manager.firefoxSingular) {
    var err = new Error('Firefox currently does not support multiplexing after a DataChannel has already been established');
    err.type = 'firefoxism';
    this.emit('error', err);
    return;
  }

  if (!manager) {
    manager = new ConnectionManager(this.id, peer, this._socket, options);
    this._attachManagerListeners(manager);
    this.managers[peer] = manager;
    this.connections[peer] = manager.connections;
  }

  var connection = manager.connect(options);

  if (!this.id) {
    this._queued.push(manager);
  }
  return connection;
};

/**
 * Return the peer id or null, if there's no id at the moment.
 * Reasons for no id could be 'connect in progress' or 'disconnected'
 */
Peer.prototype.getId = function() {
  return this.id;
};

/**
 * Destroys the Peer: closes all active connections as well as the connection
 *  to the server.
 * Warning: The peer can no longer create or accept connections after being
 *  destroyed.
 */
Peer.prototype.destroy = function() {
  if (!this.destroyed) {
    this._cleanup();
    this.destroyed = true;
  }
};

/**
 * Disconnects the Peer's connection to the PeerServer. Does not close any
 *  active connections.
 * Warning: The peer can no longer create or accept connections after being
 *  disconnected. It also cannot reconnect to the server.
 */
Peer.prototype.disconnect = function() {
  if (!this.disconnected) {
    if (!!this._socket) {
      this._socket.close();
    }
    this.id = null;
    this.disconnected = true;
  }
};

/** The current browser. */
Peer.browser = util.browserisms;

/**
 * Provides a clean method for checking if there's an active connection to the
 * peer server.
 */
Peer.prototype.getIsConnected = function() {
  return !this.disconnected;
};

/**
 * Returns true if this peer is destroyed and can no longer be used.
 */
Peer.prototype.isDestroyed = function() {
  return this.destroyed;
};

exports.Peer = Peer;
/**
 * Wraps a DataChannel between two Peers.
 */
function DataConnection(peer, dc, options) {
  if (!(this instanceof DataConnection)) return new DataConnection(peer, dc, options);
  EventEmitter.call(this);

  options = util.extend({
    serialization: 'binary'
  }, options);

  // Connection is not open yet.
  this.open = false;

  this.label = options.label;
  this.metadata = options.metadata;
  this.serialization = options.serialization;
  this.peer = peer;
  this.reliable = options.reliable;

  this._dc = dc;
  if (!!this._dc) {
    this._configureDataChannel();
  }
};

util.inherits(DataConnection, EventEmitter);

DataConnection.prototype._configureDataChannel = function() {
  var self = this;
  if (util.browserisms !== 'Webkit') {
    // Webkit doesn't support binary yet
    this._dc.binaryType = 'arraybuffer';
  }
  this._dc.onopen = function() {
    util.log('Data channel connection success');
    self.open = true;
    self.emit('open');
  };

  // Use the Reliable shim for non Firefox browsers
  if (this.reliable && util.browserisms !== 'Firefox') {
    this._reliable = new Reliable(this._dc, util.debug);
  }

  if (this._reliable) {
    this._reliable.onmessage = function(msg) {
      self.emit('data', msg);
    };
  } else {
    this._dc.onmessage = function(e) {
      self._handleDataMessage(e);
    };
  }
  this._dc.onclose = function(e) {
    util.log('DataChannel closed.');
    self.close();
  };

};

DataConnection.prototype._cleanup = function() {
  if (!!this._dc && this._dc.readyState !== 'closed') {
    this._dc.close();
    this._dc = null;
  }
  this.open = false;
  this.emit('close');
};

// Handles a DataChannel message.
DataConnection.prototype._handleDataMessage = function(e) {
  var self = this;
  var data = e.data;
  var datatype = data.constructor;
  if (this.serialization === 'binary' || this.serialization === 'binary-utf8') {
    if (datatype === Blob) {
      // Datatype should never be blob
      util.blobToArrayBuffer(data, function(ab) {
        data = util.unpack(ab);
        self.emit('data', data);
      });
      return;
    } else if (datatype === ArrayBuffer) {
      data = util.unpack(data);
    } else if (datatype === String) {
      // String fallback for binary data for browsers that don't support binary yet
      var ab = util.binaryStringToArrayBuffer(data);
      data = util.unpack(ab);
    }
  } else if (this.serialization === 'json') {
    data = JSON.parse(data);
  }
  this.emit('data', data);
};

DataConnection.prototype.addDC = function(dc) {
  this._dc = dc;
  this._configureDataChannel();
};


/**
 * Exposed functionality for users.
 */

/** Allows user to close connection. */
DataConnection.prototype.close = function() {
  if (!this.open) {
    return;
  }
  this._cleanup();
};

/** Allows user to send data. */
DataConnection.prototype.send = function(data) {
  if (!this.open) {
    this.emit('error', new Error('Connection no longer open.'));
  }
  if (this._reliable) {
    // Note: reliable sending will make it so that you cannot customize
    // serialization.
    this._reliable.send(data);
    return;
  }
  var self = this;
  if (this.serialization === 'none') {
    this._dc.send(data);
  } else if (this.serialization === 'json') {
    this._dc.send(JSON.stringify(data));
  } else {
    var utf8 = (this.serialization === 'binary-utf8');
    var blob = util.pack(data, utf8);
    // DataChannel currently only supports strings.
    if (util.browserisms === 'Webkit') {
      util.blobToBinaryString(blob, function(str){
        self._dc.send(str);
      });
    } else {
      this._dc.send(blob);
    }
  }
};

/**
 * Returns true if the DataConnection is open and able to send messages.
 */
DataConnection.prototype.isOpen = function() {
  return this.open;
};

/**
 * Gets the metadata associated with this DataConnection.
 */
DataConnection.prototype.getMetadata = function() {
  return this.metadata;
};

/**
 * Gets the label associated with this DataConnection.
 */
DataConnection.prototype.getLabel = function() {
  return this.label;
};

/**
 * Gets the brokering ID of the peer that you are connected with.
 * Note that this ID may be out of date if the peer has disconnected from the
 *  server, so it's not recommended that you use this ID to identify this
 *  connection.
 */
DataConnection.prototype.getPeer = function() {
  return this.peer;
};
/**
 * Manages DataConnections between its peer and one other peer.
 * Internally, manages PeerConnection.
 */
function ConnectionManager(id, peer, socket, options) {
  if (!(this instanceof ConnectionManager)) return new ConnectionManager(id, peer, socket, options);
  EventEmitter.call(this);

  options = util.extend({
    config: { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] }
  }, options);
  this._options = options;

  // PeerConnection is not yet dead.
  this.open = true;

  this.id = id;
  this.peer = peer;
  this.pc = null;

  // Mapping labels to metadata and serialization.
  // label => { metadata: ..., serialization: ..., reliable: ...}
  this.labels = {};
  // A default label in the event that none are passed in.
  this._default = 0;

  // DataConnections on this PC.
  this.connections = {};
  this._queued = [];

  this._socket = socket;

  if (!!this.id) {
    this.initialize();
  }
};

util.inherits(ConnectionManager, EventEmitter);

ConnectionManager.prototype.initialize = function(id, socket) {
  if (!!id) {
    this.id = id;
  }
  if (!!socket) {
    this._socket = socket;
  }

  // Set up PeerConnection.
  this._startPeerConnection();

  // Process queued DCs.
  this._processQueue();

  // Listen for ICE candidates.
  this._setupIce();

  // Listen for negotiation needed.
  // Chrome only **
  this._setupNegotiationHandler();

  // Listen for data channel.
  this._setupDataChannel();

  this.initialize = function() { };
};

/** Start a PC. */
ConnectionManager.prototype._startPeerConnection = function() {
  util.log('Creating RTCPeerConnection');
  this.pc = new RTCPeerConnection(this._options.config, { optional: [ { RtpDataChannels: true } ]});
};

/** Add DataChannels to all queued DataConnections. */
ConnectionManager.prototype._processQueue = function() {
  var conn = this._queued.pop();
  if (!!conn) {
    var reliable = util.browserisms === 'Firefox' ? conn.reliable : false;
    conn.addDC(this.pc.createDataChannel(conn.label, { reliable: reliable }));
  }
};

/** Set up ICE candidate handlers. */
ConnectionManager.prototype._setupIce = function() {
  util.log('Listening for ICE candidates.');
  var self = this;
  this.pc.onicecandidate = function(evt) {
    if (evt.candidate) {
      util.log('Received ICE candidates.');
      self._socket.send({
        type: 'CANDIDATE',
        payload: {
          candidate: evt.candidate
        },
        dst: self.peer
      });
    }
  };
  this.pc.oniceconnectionstatechange = function() {
    if (!!self.pc && self.pc.iceConnectionState === 'disconnected') {
      util.log('iceConnectionState is disconnected, closing connections to ' + this.peer);
      self.close();
    }
  };
  // Fallback for older Chrome impls.
  this.pc.onicechange = function() {
    if (!!self.pc && self.pc.iceConnectionState === 'disconnected') {
      util.log('iceConnectionState is disconnected, closing connections to ' + this.peer);
      self.close();
    }
  };
};

/** Set up onnegotiationneeded. */
ConnectionManager.prototype._setupNegotiationHandler = function() {
  var self = this;
  util.log('Listening for `negotiationneeded`');
  this.pc.onnegotiationneeded = function() {
    util.log('`negotiationneeded` triggered');
    self._makeOffer();
  };
};

/** Set up Data Channel listener. */
ConnectionManager.prototype._setupDataChannel = function() {
  var self = this;
  util.log('Listening for data channel');
  this.pc.ondatachannel = function(evt) {
    util.log('Received data channel');
    var dc = evt.channel;
    var label = dc.label;
    // This should not be empty.
    var options = self.labels[label] || {};
    var connection  = new DataConnection(self.peer, dc, options);
    self._attachConnectionListeners(connection);
    self.connections[label] = connection;
    self.emit('connection', connection);
  };
};

/** Send an offer. */
ConnectionManager.prototype._makeOffer = function() {
  var self = this;
  this.pc.createOffer(function(offer) {
    util.log('Created offer.');
    // Firefox currently does not support multiplexing once an offer is made.
    self.firefoxSingular = true;

    if (util.browserisms === 'Webkit') {
      offer.sdp = Reliable.higherBandwidthSDP(offer.sdp);
    }

    self.pc.setLocalDescription(offer, function() {
      util.log('Set localDescription to offer');
      self._socket.send({
        type: 'OFFER',
        payload: {
          sdp: offer,
          config: self._options.config,
          labels: self.labels
        },
        dst: self.peer
      });
      // We can now reset labels because all info has been communicated.
      self.labels = {};
    }, function(err) {
      self.emit('error', err);
      util.log('Failed to setLocalDescription, ', err);
    });
  }, function(err) {
    self.emit('error', err);
    util.log('Failed to createOffer, ', err);
  });
};

/** Create an answer for PC. */
ConnectionManager.prototype._makeAnswer = function() {
  var self = this;
  this.pc.createAnswer(function(answer) {
    util.log('Created answer.');

    if (util.browserisms === 'Webkit') {
      answer.sdp = Reliable.higherBandwidthSDP(answer.sdp);
    }

    self.pc.setLocalDescription(answer, function() {
      util.log('Set localDescription to answer.');
      self._socket.send({
        type: 'ANSWER',
        payload: {
          sdp: answer
        },
        dst: self.peer
      });
    }, function(err) {
      self.emit('error', err);
      util.log('Failed to setLocalDescription, ', err);
    });
  }, function(err) {
    self.emit('error', err);
    util.log('Failed to create answer, ', err);
  });
};

/** Clean up PC, close related DCs. */
ConnectionManager.prototype._cleanup = function() {
  util.log('Cleanup ConnectionManager for ' + this.peer);
  if (!!this.pc && (this.pc.readyState !== 'closed' || this.pc.signalingState !== 'closed')) {
    this.pc.close();
    this.pc = null;
  }

  var self = this;
  this._socket.send({
    type: 'LEAVE',
    dst: self.peer
  });

  this.open = false;
  this.emit('close');
};

/** Attach connection listeners. */
ConnectionManager.prototype._attachConnectionListeners = function(connection) {
  var self = this;
  connection.on('close', function() {
    if (!!self.connections[connection.label]) {
      delete self.connections[connection.label];
    }

    if (!Object.keys(self.connections).length) {
      self._cleanup();
    }
  });
  connection.on('open', function() {
    self._lock = false;
    self._processQueue();
  });
};

/** Handle an SDP. */
ConnectionManager.prototype.handleSDP = function(sdp, type) {
  sdp = new RTCSessionDescription(sdp);

  var self = this;
  this.pc.setRemoteDescription(sdp, function() {
    util.log('Set remoteDescription: ' + type);
    if (type === 'OFFER') {
      self._makeAnswer();
    }
  }, function(err) {
    self.emit('error', err);
    util.log('Failed to setRemoteDescription, ', err);
  });
};

/** Handle a candidate. */
ConnectionManager.prototype.handleCandidate = function(message) {
  var candidate = new RTCIceCandidate(message.candidate);
  this.pc.addIceCandidate(candidate);
  util.log('Added ICE candidate.');
};

/** Handle peer leaving. */
ConnectionManager.prototype.handleLeave = function() {
  util.log('Peer ' + this.peer + ' disconnected.');
  this.close();
};

/** Closes manager and all related connections. */
ConnectionManager.prototype.close = function() {
  if (!this.open) {
    this.emit('error', new Error('Connections to ' + this.peer + 'are already closed.'));
    return;
  }

  var labels = Object.keys(this.connections);
  for (var i = 0, ii = labels.length; i < ii; i += 1) {
    var label = labels[i];
    var connection = this.connections[label];
    connection.close();
  }
  this.connections = null;
  this._cleanup();
};

/** Create and returns a DataConnection with the peer with the given label. */
ConnectionManager.prototype.connect = function(options) {
  if (!this.open) {
    return;
  }

  options = util.extend({
    label: 'peerjs',
    reliable: (util.browserisms === 'Firefox')
  }, options);

  // Check if label is taken...if so, generate a new label randomly.
  while (!!this.connections[options.label]) {
    options.label = 'peerjs' + this._default;
    this._default += 1;
  }

  this.labels[options.label] = options;

  var dc;
  if (!!this.pc && !this._lock) {
    var reliable = util.browserisms === 'Firefox' ? options.reliable : false;
    dc = this.pc.createDataChannel(options.label, { reliable: reliable });
    if (util.browserisms === 'Firefox') {
      this._makeOffer();
    }
  }
  var connection = new DataConnection(this.peer, dc, options);
  this._attachConnectionListeners(connection);
  this.connections[options.label] = connection;

  if (!this.pc || this._lock) {
    this._queued.push(connection);
  }

  this._lock = true
  return connection;
};

/** Updates label:[serialization, reliable, metadata] pairs from offer. */
ConnectionManager.prototype.update = function(updates) {
  var labels = Object.keys(updates);
  for (var i = 0, ii = labels.length; i < ii; i += 1) {
    var label = labels[i];
    this.labels[label] = updates[label];
  }
};
/**
 * An abstraction on top of WebSockets and XHR streaming to provide fastest
 * possible connection for peers.
 */
function Socket(host, port, key, id) {
  if (!(this instanceof Socket)) return new Socket(host, port, key, id);
  EventEmitter.call(this);

  this._id = id;
  var token = util.randomToken();

  this.disconnected = false;

  var secure = util.isSecure();
  var protocol = secure ? 'https://' : 'http://';
  var wsProtocol = secure ? 'wss://' : 'ws://';
  this._httpUrl = protocol + host + ':' + port + '/' + key + '/' + id + '/' + token;
  this._wsUrl = wsProtocol + host + ':' + port + '/peerjs?key='+key+'&id='+id+'&token='+token;
};

util.inherits(Socket, EventEmitter);


/** Check in with ID or get one from server. */
Socket.prototype.start = function() {  
  this._startXhrStream();
  this._startWebSocket();
};


/** Start up websocket communications. */
Socket.prototype._startWebSocket = function() {
  var self = this;

  if (!!this._socket) {
    return;
  }

  this._socket = new WebSocket(this._wsUrl);

  this._socket.onmessage = function(event) {
    var data;
    try {
      data = JSON.parse(event.data);
    } catch(e) {
      util.log('Invalid server message', event.data);
      return;
    }
    self.emit('message', data);
  };

  // Take care of the queue of connections if necessary and make sure Peer knows
  // socket is open.
  this._socket.onopen = function() {
    if (!!self._timeout) {
      clearTimeout(self._timeout);
      setTimeout(function(){
        self._http.abort();
        self._http = null;
      }, 5000);
    }
    util.log('Socket open');
  };
};

/** Start XHR streaming. */
Socket.prototype._startXhrStream = function(n) {
  try {
    var self = this;
    this._http = new XMLHttpRequest();
    this._http._index = 1;
    this._http._streamIndex = n || 0;
    this._http.open('post', this._httpUrl + '/id?i=' + this._http._streamIndex, true);
    this._http.onreadystatechange = function() {
      if (this.readyState == 2 && !!this.old) {
        this.old.abort();
        delete this.old;
      }
      if (this.readyState > 2 && this.status == 200 && !!this.responseText) {
        self._handleStream(this);
      }
    };
    this._http.send(null);
    this._setHTTPTimeout();
  } catch(e) {
    util.log('XMLHttpRequest not available; defaulting to WebSockets');
  }
};


/** Handles onreadystatechange response as a stream. */
Socket.prototype._handleStream = function(http) {
  // 3 and 4 are loading/done state. All others are not relevant.
  var messages = http.responseText.split('\n');

  // Check to see if anything needs to be processed on buffer.
  if (!!http._buffer) {
    while (http._buffer.length > 0) {
      var index = http._buffer.shift();
      var bufferedMessage = messages[index];
      try {
        bufferedMessage = JSON.parse(bufferedMessage);
      } catch(e) {
        http._buffer.shift(index);
        break;
      }
      this.emit('message', bufferedMessage);
    }
  }

  var message = messages[http._index];
  if (!!message) {
    http._index += 1;
    // Buffering--this message is incomplete and we'll get to it next time.
    // This checks if the httpResponse ended in a `\n`, in which case the last
    // element of messages should be the empty string.
    if (http._index === messages.length) {
      if (!http._buffer) {
        http._buffer = [];
      }
      http._buffer.push(http._index - 1);
    } else {
      try {
        message = JSON.parse(message);
      } catch(e) {
        util.log('Invalid server message', message);
        return;
      }
      this.emit('message', message);
    }
  }
};

Socket.prototype._setHTTPTimeout = function() {
  var self = this;
  this._timeout = setTimeout(function() {
    var old = self._http;
    if (!self._wsOpen()) {
      self._startXhrStream(old._streamIndex + 1);
      self._http.old = old;        
    } else {
      old.abort();
    }
  }, 25000);
};


Socket.prototype._wsOpen = function() {
  return !!this._socket && this._socket.readyState == 1;
};

/** Exposed send for DC & Peer. */
Socket.prototype.send = function(data) {
  if (this.disconnected) {
    return;
  }

  if (!data.type) {
    this.emit('error', 'Invalid message');
    return;
  }

  var message = JSON.stringify(data);
  if (this._wsOpen()) {
    this._socket.send(message);
  } else {
    var http = new XMLHttpRequest();
    var url = this._httpUrl + '/' + data.type.toLowerCase();
    http.open('post', url, true);
    http.setRequestHeader('Content-Type', 'application/json');
    http.send(message);
  }
};

Socket.prototype.close = function() {
  if (!this.disconnected && this._wsOpen()) {
    this._socket.close();
    this.disconnected = true;
  }
};

})(this);
/**
 * Created with JetBrains RubyMine.
 * User: Eli
 * Date: 7/12/13
 * Time: 12:41 PM
 * To change this template use File | Settings | File Templates.
 */
function maqawAjaxPost(url, params, callback) {
    var xhr;

    if(typeof XMLHttpRequest !== 'undefined') xhr = new XMLHttpRequest();
    else {
        var versions = ["MSXML2.XmlHttp.5.0",
            "MSXML2.XmlHttp.4.0",
            "MSXML2.XmlHttp.3.0",
            "MSXML2.XmlHttp.2.0",
            "Microsoft.XmlHttp"]

        for(var i = 0, len = versions.length; i < len; i++) {
            try {
                xhr = new ActiveXObject(versions[i]);
                break;
            }
            catch(e){}
        } // end for
    }

    xhr.onreadystatechange = ensureReadiness;

    function ensureReadiness() {
        // post completed
        if(xhr.readyState === 4) {
            callback(xhr);
        }
    }


    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.send(params);

}

var maqawCookies = {
  //
  // Thank you, Mozilla 
  // Documentation at https://developer.mozilla.org/en-US/docs/Web/API/document.cookie

  getItem: function (sKey) {
    return decodeURI(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURI(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { 
      return false; 
    }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toGMTString();
          break;
      }
    }
    document.cookie = encodeURI(sKey) + "=" + encodeURI(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },

  removeItem: function (sKey, sPath) {
    if (!sKey || !this.hasItem(sKey)) { return false; }
    document.cookie = encodeURI(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sPath ? "; path=" + sPath : "");
    return true;
  },

  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + encodeURI(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  }

};
/*
 Creates a chat window with a unique key to talk
 to a visitor.
 */
function MaqawChatSession(chatSessionContainer, peer, srcName, dstName, dstId, connectionCallback) {

    this.srcName = srcName;
    this.dstName = dstName;
    this.dstId = dstId;
    var that = this;
    this.peer = peer;
    this.isConnected = false;
    this.conn;

    // whether or not the chat session should allow a rep to send a message
    // this will be updated based on the connection status with the visitor
    this.isSendingAllowed;

    // callback function for when the connection status changes. True is passed if a connection
    // becomes open, and false is passed if the connection closes
    this.connectionCallback = connectionCallback;

    // parent div to display chat session
    this.mainContainer = chatSessionContainer;

    // add div to display chat text
    this.textDisplay;
    this.textDisplay = document.createElement('DIV');
    this.textDisplay.className = 'maqaw-chat-display';
    this.mainContainer.appendChild(this.textDisplay);

    this.textDisplay.addEventListener('load', function () {
        alert('hi')
    }, false);

    // put initial text in the display window
    this.textDisplay.innerHTML = "Questions or feedback? We're online and ready to help you!";

    // add box for text entry
    this.textInput;
    this.textInput = document.createElement('textarea');
    this.textInput.className = 'maqaw-chat-entry';
    this.textInput.setAttribute('placeholder', 'Type and hit enter to chat');
    this.mainContainer.appendChild(this.textInput);


    // add listener to text input. Capture text when enter is pressed
    try {
        this.textInput.addEventListener("keyup", keyPress, false);
    } catch (e) {
        this.textInput.attachEvent("onkeyup", keyPress);
    }


    function keyPress(e) {
        // check if enter was pressed
        if (e.keyCode === 13) {
            // get entered text and reset the box
            var text = that.textInput.value;
            that.textInput.value = "";
            handleInput(text);
            // scroll to bottom of chat window
            that.scrollToBottom();
        }
    }

    // This function is passed any text that the user inputs
    function handleInput(text) {
        // test if string is not just whitespace
        if (/\S/.test(text)) {
            //send data to other side
            if (that.conn) that.conn.send(text);
            // append new text to existing chat text
            that.textDisplay.innerHTML = that.textDisplay.innerHTML + "<p class='maqaw-chat-paragraph'>" +
                "<span class='maqaw-chat-src-name'>" + that.srcName + ": </span>" + text + "</p>";
        }
    }

    function handleResponse(text) {
        // test if string is not just whitespace
        if (/\S/.test(text)) {
            // append new text to existing chat text
            that.textDisplay.innerHTML = that.textDisplay.innerHTML + "<p class='maqaw-chat-paragraph'>" +
                "<span class='maqaw-chat-dest-name'>" + that.dstName + ": </span>" + text + "</p>";

            that.scrollToBottom();
        }

    }


    // scroll chat window to most recent text
    this.scrollToBottom = function () {
        that.textDisplay.scrollTop = that.textDisplay.scrollHeight;
    };

    // returns to current text in the chat window
    this.getText = function () {
        return that.textDisplay.innerHTML;
    };

    // sets the chat window to have this text
    this.setText = function (text) {
        that.textDisplay.innerHTML = text;
    };

    // Attempts to open a peerjs connection if the connection is currently closed,
    // and an id has been provided
    this.openConnection = function (onOpenCallback) {
        if (that.dstId) {
            console.log(that + ": attempting connection with " + that.dstId + "at " + (new Date()).toLocaleTimeString());
            that.conn = that.peer.connect(that.dstId, {reliable: false});
            if (that.conn) {
                that.conn.on('open', function () {
                    console.log(that + ": Connection opened with " + that.dstId + " at " + (new Date()).toLocaleTimeString());
                    // invoke the callback if one was provided
                    onOpenCallback && onOpenCallback();
                    connect(that.conn);
                });
                that.conn.on('error', function (err) {
                    console.log("Connection error: " + err);
                });
            }
        }
    };

    /* Set up peerjs connection handling for this chat session */
    this.peer.on('connection', receiveRequestFromPeer);
    function connect(c) {
        console.log("in connect");
        setConnectionStatus(true);
        that.conn = c;
        that.conn.on('data', function (data) {
            console.log(data);
            handleResponse(data);
        });
        that.conn.on('close', function (err) {
            setConnectionStatus(false);
        });


    }

    // An on Connection event that was triggered by receiving a connection from a peer
    function receiveRequestFromPeer(conn) {
        console.log("in receiveRequestFromPeer");
        //setConnectionStatus(true);
        that.conn = conn;

        that.conn.on('open', function () {
            console.log("on open in peer");
            setConnectionStatus(true);
        });

        that.conn.on('data', function (data) {
            console.log(data);
            if (!that.isConnected) {
                setConnectionStatus(true);
            }
            handleResponse(data);
        });
        that.conn.on('close', function (err) {
            setConnectionStatus(false);
        });

        that.conn.on('error', function (err) {
            console.log("Connection error: " + err);
        });
    }

    // takes a boolean representing if the peer is connected or not
    // updates the setting, and turns off the text input box if
    // a connection is not active. Calls a connectionCallback as well
    // if one was provided
    function setConnectionStatus(connectionStatus) {
        that.isConnected = connectionStatus;
        console.log("Setting connection status to " + connectionStatus);

        // change status of text input depending on connection
        if (connectionStatus) {
            allowMessages();
        } else {
            disallowMessages();
        }

        if (that.connectionCallback) {
            that.connectionCallback(connectionStatus);
        }
    }

    this.getIsConnected = function () {
        return that.isConnected;
    };

    // if the connection is open, close it
    this.disconnect = function () {
        if (that.isConnected) {
            conn.close();
        }
    };

    // the allowMessageSending flag tells the chatsession whether or not they
    // should let the rep send messages to the client. This should be disallowed
    // when the client's connection stop, and reallowed when the connection starts again
    this.setAllowMessageSending = function (allowMessageSending) {
        // only do something if the state changed
        if (allowMessageSending !== that.isSendingAllowed) {
            if (allowMessageSending) {
                allowMessages();
            } else {
                disallowMessages();
            }
        }
    };

    // disallow sending messages until a connection is opened
    // prevent a message from being sent
    var savedTextValue = null;
    disallowMessages();

    // Finish by attempting to open a connection if applicable
    if (that.dstId) {
        attemptConnection();
    }


    function disallowMessages() {
        console.log("In disallowed messages");
        if (that.textInput) {
            that.isSendingAllowed = false;
            that.textInput.disabled = true;
            // change text to reflect this, if it hasn't already been saved
            if (savedTextValue == null) {
                savedTextValue = that.textInput.value;
                console.log("Saving value: " + savedTextValue);
                that.textInput.value = "Connecting to peer...";
            }
        }
        console.log('disallow messages');
    }

    // allow messages to be sent
    function allowMessages() {
        console.log("In allow messages");
        if (that.textInput) {
            that.isSendingAllowed = true;
            that.textInput.disabled = false;
            // restore original text
            if (savedTextValue !== null) {
                console.log("Restoring value: " + savedTextValue);
                that.textInput.value = savedTextValue;
                savedTextValue = null;
            }
        }
    }


    function attemptConnection() {
        // how many milliseconds we will wait until trying to connect again
        var retryInterval = 8000;
        var isConnected = false;

        //  The max number of times a connection will be attempted
        var retryLimit = 5;
        var numAttempts = 0;

        // this function is called when a successful connection is opened
        function successCallback() {
            isConnected = true;
        }

        // create a function that will attempt to open a connection, and will retry
        // every retryInterval milliseconds until a connection is established
        // this function is immediately invoked
        (function tryOpeningConnection() {
            // start the connection opening process
            if (!isConnected && numAttempts < retryLimit) {
                numAttempts++;
                that.openConnection(successCallback);

                // schedule it to try again in a bit.
                setTimeout(tryOpeningConnection, retryInterval);
            }
        })();


    }
}

// Returns the main div container for the chat session
MaqawChatSession.prototype.getContainer = function () {
    return this.mainContainer;
};



/*
 ClientSession manages client information and interactions
 with Maqaw.
 */
function MaqawVisitorSession(manager) {
    var that = this;
    this.chatSession;
    this.maqawManager = manager;
    // Whether or not there is a rep available to chat
    this.isRepAvailable = false;

    // initialize header container for this session
    this.header = document.createElement('DIV');
    this.header.className = 'maqaw-default-client-header';

    // initialize body container
    this.body = document.createElement('DIV');

    /* Create elements that make up chat window */
    this.loginHeader = document.createElement('DIV');
    this.loginHeader.innerHTML = "Chat with me!";
    this.loginHeader.className = 'maqaw-chat-header-text';

    // create div to hold chat info
    this.visitorChatWindow = document.createElement('DIV');
    this.visitorChatWindow.className = 'maqaw-client-chat-window';

    // add chat session
    var chatSessionContainer = document.createElement("DIV");
    this.visitorChatWindow.appendChild(chatSessionContainer);


    // create MaqawChatSession
    // don't include a connection id so that no connection is started from this end. Leave
    // it to the rep to start a connection
    chatSessionContainer.innerHTML = '';
    this.chatSession = new MaqawChatSession(chatSessionContainer, that.maqawManager.peer, 'You', this.maqawManager.chatName);

    // add footer
    var chatFooter;
    chatFooter = document.createElement('DIV');
    chatFooter.id = 'maqaw-chat-footer';
    this.visitorChatWindow.appendChild(chatFooter);

    // add login button to footer
    var loginButton;
    loginButton = document.createElement('DIV');
    loginButton.id = 'maqaw-login-button';
    loginButton.innerHTML = "Login"
    chatFooter.appendChild(loginButton);

    // setup callback for when login is clicked
    loginButton.addEventListener('click', this.maqawManager.loginClicked, false);

    // add Maqaw link to footer
    var maqawLink;
    maqawLink = document.createElement('DIV');
    maqawLink.id = 'maqaw-link';
    maqawLink.innerHTML = 'POWERED BY <a href="http://maqaw.com">MAQAW</a>';
    chatFooter.appendChild(maqawLink);

    /* Create container for when no rep is available */
    this.noRepWindow = document.createElement("DIV");
    this.noRepWindow.id = 'maqaw-no-rep-window';
    this.noRepWindow.className = 'maqaw-client-chat-window'
    this.noRepWindow.innerHTML = '';

    var noRepText = document.createElement("DIV");
    noRepText.className = 'maqaw-chat-display';
    noRepText.innerHTML = 'Sorry, there are no representatives available to chat';
    this.noRepWindow.appendChild(noRepText);

    this.noRepHeader = document.createElement('DIV');
    this.noRepHeader.innerHTML = "Send us an email!";
    this.noRepHeader.className = 'maqaw-chat-header-text';

    // add footer
    var noRepFooter;
    noRepFooter = document.createElement('DIV');
    noRepFooter.id = 'maqaw-chat-footer';
    this.noRepWindow.appendChild(noRepFooter);

    // add login button to footer
    var noRepLoginButton;
    noRepLoginButton = document.createElement('DIV');
    noRepLoginButton.id = 'maqaw-login-button';
    noRepLoginButton.innerHTML = "Login"
    noRepFooter.appendChild(noRepLoginButton);

    // setup callback for when login is clicked
    noRepLoginButton.addEventListener('click', this.maqawManager.loginClicked, false);

    // add Maqaw link to footer
    var maqawLink;
    maqawLink = document.createElement('DIV');
    maqawLink.id = 'maqaw-link';
    maqawLink.innerHTML = 'POWERED BY <a href="http://maqaw.com">MAQAW</a>';
    noRepFooter.appendChild(maqawLink);

    // set the chat window to default to no rep
    setNoRepPage();

    function setClientChat() {
        that.body.innerHTML = '';
        that.body.appendChild(that.visitorChatWindow);
        that.header.innerHTML = '';
        that.header.appendChild(that.loginHeader);
    }

    function setNoRepPage() {
        that.body.innerHTML = '';
        that.body.appendChild(that.noRepWindow);
        that.header.innerHTML = '';
        that.header.appendChild(that.noRepHeader);
    }

    /*
     Updates whether or not their is an available rep for the visitor to chat with.
     Pass in true if there is a rep available or false otherwise.
     */
    this.setIsRepAvailable = function(isRepAvailable){
        if(isRepAvailable !== that.isRepAvailable){
            if(isRepAvailable) {
                setClientChat();
            }
            else {
                setNoRepPage();
            }
        }
        this.isRepAvailable = isRepAvailable;
    };



    // returns an object containing the data that constitutes this visitors session
    this.getSessionData = function() {
        return {
            chatText: that.chatSession.getText()
        };
    };

    // takes an visitor session data object (from getSessionData) and loads this visitor
    // session with it
    this.loadSessionData = function(sessionData) {
        that.chatSession.setText(sessionData.chatText);
    }
}

MaqawVisitorSession.prototype.getBodyContents = function () {
    return this.body;
};

MaqawVisitorSession.prototype.getHeaderContents = function () {
    return this.header;
};




/*
 MaqawManager is the top level class for managing the Maqaw client
 */
function MaqawManager(options, display) {
    var that = this,
        host = '54.214.232.157',
        port = 3000;

    // the key that peers will use to connect to each other on the peer server
    this.key = options.key;
    this.chatName = options.name;

    // this id is used whenever the client makes a connection with peerjs
    this.id = maqawCookies.getItem('peerId');
    // an array of ids of representatives that are available for chat
    this.representatives;
    this.maqawDisplay = display;
    this.visitorSession;
    this.repSession;

    // a MaqawLoginPage object that can be used to login with rep details
    this.loginPage;

    // the most recent list of visitors from the server
    this.visitors = [];


    if (this.id) {
        //  peer id has been stored in the browser. Use it
        this.peer = new Peer(this.id, {key: this.key, host: host, port: port});
    } else {
        //  No peer id cookie found. Retrieve new id from browser
        this.peer = new Peer({key: this.key, host: host, port: port});
    }

    /* listen for peer js events */
    this.peer.on('open', function (id) {
        that.id = id;
        console.log("My id: "+id);

        maqawCookies.setItem('peerId', id, Infinity);

    });

    this.peer.on('clients', function (visitors) {
        console.log('visitors: ' + visitors.msg);
        that.visitors = visitors.msg;
        that.repSession && that.repSession.updateVisitorList(visitors.msg);
    });

    this.peer.on('clients', function (visitors) {
        console.log("second on clients!");
    });

    this.peer.on('representatives', function (reps) {
        console.log('Reps: ' + reps.msg);
        that.representatives = reps.msg;
        updateReps();
    });

    // function called the VisitorSession when the login button is clicked
    this.loginClicked = function () {
        // create and display a new LoginPage object if one doesn't already exist
        if(!that.loginPage){
            that.loginPage = new MaqawLoginPage(that);
        }
        that.maqawDisplay.setHeaderContents(that.loginPage.getHeaderContents());
        that.maqawDisplay.setBodyContents(that.loginPage.getBodyContents());
    };


    this.logoutClicked = function () {
        // clear cookies and local data for the rep
        maqawCookies.removeItem('maqawRepLoginCookie');
        localStorage.removeItem('maqawRepSession');
        that.showVisitorSession();
    };

    // displays the saved visitor session
    this.showVisitorSession = function () {
        that.maqawDisplay.setHeaderContents(that.visitorSession.getHeaderContents());
        that.maqawDisplay.setBodyContents(that.visitorSession.getBodyContents());
    };

    // tries to load a previously saved visitor session. If no session can be found
    // a new one is created
    this.startVisitorSession = function () {
        // create new visitor session
        var visitorSession = new MaqawVisitorSession(that);
        // try to pull previously saved session data
        var storedSessionData = JSON.parse(localStorage.getItem('maqawVisitorSession'));
        // if previous data was found load it into the visitorSession
        if (storedSessionData) {
            visitorSession.loadSessionData(storedSessionData);
        }
        // save the session
        that.visitorSession = visitorSession;
    };

    // Creates and displays a new MaqawRepSession using the MaqawRepresentative object that
    // is passed in.
    this.startNewRepSession = function (rep) {
        that.repSession = new MaqawRepSession(that, rep);

        // if we are loading a saved session, retrieve stored data
        if (that.loadPreviousRepSession) {
            // attempt to reload previous rep session data
            var storedSessionData = JSON.parse(localStorage.getItem('maqawRepSession'));
            // if previous data was found load it into the repSession
            if (storedSessionData) {
                that.repSession.loadSessionData(storedSessionData);
            }
        }

        // update the session with the current list of visitors
        that.repSession.updateVisitorList(that.visitors);

        // display the rep session
        that.maqawDisplay.setHeaderContents(that.repSession.getHeaderContents());
        that.maqawDisplay.setBodyContents(that.repSession.getBodyContents());
    };

    // checks for a login cookie for a rep. If one is found we attempt to reload the session
    // return true if a rep session is successfully loaded and false otherwise
    this.loadRepSession = function () {
        // check for a login cookie, return false if one can't be found
        var loginCookie = maqawCookies.getItem('maqawRepLoginCookie');
        if (loginCookie === null) {
            return false;
        }

        // otherwise reload the rep session
        if(!that.loginPage){
            that.loginPage = new MaqawLoginPage(that);
        }
        that.loginPage.loginWithParams(loginCookie);
        that.loadPreviousRepSession = true;
        return true;
    }


    // updates the status of the available reps for visitor chat
    function updateReps() {
        that.visitorSession.setIsRepAvailable(that.representatives.length !== 0);
    }

    // setup an event listener for when the page is changed so that we can save the
    // visitor session
    function saveVisitorSession() {
        if (typeof that.visitorSession !== 'undefined') {
            var sessionData = that.visitorSession.getSessionData();
            var jsonSession = JSON.stringify(sessionData);
            localStorage.setItem('maqawVisitorSession', jsonSession);
        }
    }

    // save the logs and details of the rep session (if there is one)
    // in local storage so it can be reloaded on page change
    function saveRepSession() {
        if (typeof that.repSession !== 'undefined') {
            var sessionData = that.repSession.getSessionData();
            var jsonSession = JSON.stringify(sessionData);
            console.log(jsonSession);
            localStorage.setItem('maqawRepSession', jsonSession);

        }
    }

    function saveSession() {
        saveVisitorSession();
        saveRepSession();

    }

    window.addEventListener('unload', saveSession, false);
}

// takes a MaqawVisitorSession object and loads it as the current visitor session
MaqawManager.prototype.setVisitorSession = function (visitorSession) {
    this.visitorSession = visitorSession;
};





/*
 MaqawManager is the top level class for managing the Maqaw client
 */
function MaqawManager(options, display) {
    var that = this,
        host = '54.214.232.157',
        port = 3000;

    // the key that peers will use to connect to each other on the peer server
    this.key = options.key;
    this.chatName = options.name;

    // this id is used whenever the client makes a connection with peerjs
    this.id = maqawCookies.getItem('peerId');
    // an array of ids of representatives that are available for chat
    this.representatives;
    this.maqawDisplay = display;
    this.visitorSession;
    this.repSession;

    // a MaqawLoginPage object that can be used to login with rep details
    this.loginPage;

    // the most recent list of visitors from the server
    this.visitors = [];


    if (this.id) {
        //  peer id has been stored in the browser. Use it
        this.peer = new Peer(this.id, {key: this.key, host: host, port: port});
    } else {
        //  No peer id cookie found. Retrieve new id from browser
        this.peer = new Peer({key: this.key, host: host, port: port});
    }

    /* listen for peer js events */
    this.peer.on('open', function (id) {
        that.id = id;
        console.log("My id: "+id);

        maqawCookies.setItem('peerId', id, Infinity);

    });

    this.peer.on('clients', function (visitors) {
        console.log('visitors: ' + visitors.msg);
        that.visitors = visitors.msg;
        that.repSession && that.repSession.updateVisitorList(visitors.msg);
    });

    this.peer.on('clients', function (visitors) {
        console.log("second on clients!");
    });

    this.peer.on('representatives', function (reps) {
        console.log('Reps: ' + reps.msg);
        that.representatives = reps.msg;
        updateReps();
    });

    // function called the VisitorSession when the login button is clicked
    this.loginClicked = function () {
        // create and display a new LoginPage object if one doesn't already exist
        if(!that.loginPage){
            that.loginPage = new MaqawLoginPage(that);
        }
        that.maqawDisplay.setHeaderContents(that.loginPage.getHeaderContents());
        that.maqawDisplay.setBodyContents(that.loginPage.getBodyContents());
    };


    this.logoutClicked = function () {
        // clear cookies and local data for the rep
        maqawCookies.removeItem('maqawRepLoginCookie');
        localStorage.removeItem('maqawRepSession');
        that.showVisitorSession();
    };

    // displays the saved visitor session
    this.showVisitorSession = function () {
        that.maqawDisplay.setHeaderContents(that.visitorSession.getHeaderContents());
        that.maqawDisplay.setBodyContents(that.visitorSession.getBodyContents());
    };

    // tries to load a previously saved visitor session. If no session can be found
    // a new one is created
    this.startVisitorSession = function () {
        // create new visitor session
        var visitorSession = new MaqawVisitorSession(that);
        // try to pull previously saved session data
        var storedSessionData = JSON.parse(localStorage.getItem('maqawVisitorSession'));
        // if previous data was found load it into the visitorSession
        if (storedSessionData) {
            visitorSession.loadSessionData(storedSessionData);
        }
        // save the session
        that.visitorSession = visitorSession;
    };

    // Creates and displays a new MaqawRepSession using the MaqawRepresentative object that
    // is passed in.
    this.startNewRepSession = function (rep) {
        that.repSession = new MaqawRepSession(that, rep);

        // if we are loading a saved session, retrieve stored data
        if (that.loadPreviousRepSession) {
            // attempt to reload previous rep session data
            var storedSessionData = JSON.parse(localStorage.getItem('maqawRepSession'));
            // if previous data was found load it into the repSession
            if (storedSessionData) {
                that.repSession.loadSessionData(storedSessionData);
            }
        }

        // update the session with the current list of visitors
        that.repSession.updateVisitorList(that.visitors);

        // display the rep session
        that.maqawDisplay.setHeaderContents(that.repSession.getHeaderContents());
        that.maqawDisplay.setBodyContents(that.repSession.getBodyContents());
    };

    // checks for a login cookie for a rep. If one is found we attempt to reload the session
    // return true if a rep session is successfully loaded and false otherwise
    this.loadRepSession = function () {
        // check for a login cookie, return false if one can't be found
        var loginCookie = maqawCookies.getItem('maqawRepLoginCookie');
        if (loginCookie === null) {
            return false;
        }

        // otherwise reload the rep session
        if(!that.loginPage){
            that.loginPage = new MaqawLoginPage(that);
        }
        that.loginPage.loginWithParams(loginCookie);
        that.loadPreviousRepSession = true;
        return true;
    }


    // updates the status of the available reps for visitor chat
    function updateReps() {
        that.visitorSession.setIsRepAvailable(that.representatives.length !== 0);
    }

    // setup an event listener for when the page is changed so that we can save the
    // visitor session
    function saveVisitorSession() {
        if (typeof that.visitorSession !== 'undefined') {
            var sessionData = that.visitorSession.getSessionData();
            var jsonSession = JSON.stringify(sessionData);
            localStorage.setItem('maqawVisitorSession', jsonSession);
        }
    }

    // save the logs and details of the rep session (if there is one)
    // in local storage so it can be reloaded on page change
    function saveRepSession() {
        if (typeof that.repSession !== 'undefined') {
            var sessionData = that.repSession.getSessionData();
            var jsonSession = JSON.stringify(sessionData);
            console.log(jsonSession);
            localStorage.setItem('maqawRepSession', jsonSession);

        }
    }

    function saveSession() {
        saveVisitorSession();
        saveRepSession();

    }

    window.addEventListener('unload', saveSession, false);
}

// takes a MaqawVisitorSession object and loads it as the current visitor session
MaqawManager.prototype.setVisitorSession = function (visitorSession) {
    this.visitorSession = visitorSession;
};





/*
 MaqawDisplay handles the graphical structure of the
 Maqaw client
 */

function MaqawDisplay(startMinimized) {
    this.startMinimized = startMinimized;
}

/*
 Constructs and styles the dom elements to display the client
 */
MaqawDisplay.prototype.setup = function () {
    // create the parent div to hold the client
    var clientContainer;
    clientContainer = document.createElement('DIV');
    clientContainer.id = 'maqaw-chat-container';
    document.body.appendChild(clientContainer);

    // The header sits on top of the client body. It is always visible, and clicking
    // on it toggles the visibility of the body. The header contents are publicly adjustable
    this.clientHeader = document.createElement('DIV');
    clientContainer.appendChild(this.clientHeader);

    // create div to contain client body
    this.clientBody = document.createElement('DIV');
    clientContainer.appendChild( this.clientBody);

    // check if the window should be minimized by default
    var isMinimized = this.startMinimized;
    if(isMinimized){
        this.clientBody.style.display = 'none';
    } else {
        this.clientBody.style.display = 'block';
    }

    // add the CSS file
    this.loadCSS();

    // when the header is clicked it should toggle between minimized and shown
    var that = this;
    function toggleMinimized() {
        if (isMinimized) {
            that.clientBody.style.display = 'block';
            isMinimized = false;
        } else {
            that.clientBody.style.display = 'none';
            isMinimized = true;
        }
    }
    this.clientHeader.addEventListener('click', toggleMinimized, false);
};

/*
Set the contents of the header. Erases any previous content
content - A single div containing the content to be placed in the header
 */
MaqawDisplay.prototype.setHeaderContents = function(content) {
    // erase any current content and replace in with the new content
    this.clientHeader.innerHTML = '';
    this.clientHeader.appendChild(content);
};

/*
Sets the body contents of the client. Erases any previous content
 content - A single div containing the content to be placed in the body
 */

MaqawDisplay.prototype.setBodyContents = function(content) {
    // erase any current content and replace in with the new content
    this.clientBody.innerHTML = '';
    this.clientBody.appendChild(content);
};

/*
Append the CSS file to the head
*/
MaqawDisplay.prototype.loadCSS = function() {
    console.log("Inside of loadCSS");
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = 'http://www.maqaw.com/cdn/maqaw.min.css';
    link.media = 'all';
    head.appendChild(link);
}/*
This object contains all the information for a representative's account
 */
function MaqawRepresentative(name) {
   this.name = name;
}/*
 RepSession manages all of the details of a logged in
 representatives session
 */
function MaqawRepSession(manager, rep) {
    this.maqawManager = manager;
    this.rep = rep;
    var that = this;

    /* Create dom elements to display the rep session */
    this.body = document.createElement("DIV");
    this.header = document.createElement("DIV");
    this.header.className = 'maqaw-default-client-header';

    // add text to header
    var header = document.createElement("DIV");
    header.innerHTML = 'Welcome!';
    header.className = 'maqaw-chat-header-text';
    this.header.appendChild(header);

    // create window for logged in users
    var loggedInWindow = document.createElement('DIV');
    this.body.appendChild(loggedInWindow);

    var loggedInChatWindow = document.createElement('DIV');
    loggedInChatWindow.id = 'maqaw-logged-in-chat-window';
    loggedInWindow.appendChild(loggedInChatWindow);

// create div to hold chat sessions
    var chatSessions = document.createElement('DIV');
    loggedInChatWindow.appendChild(chatSessions);

// add footer for logged in chat window
    var loggedInChatFooter = document.createElement('DIV');
    loggedInChatFooter.id = 'maqaw-logged-in-chat-footer';
    loggedInChatWindow.appendChild(loggedInChatFooter);

// add logout button
    var logoutButton = document.createElement('DIV');
    logoutButton.id = 'maqaw-logout-button';
    logoutButton.innerHTML = 'Logout';
    loggedInChatFooter.appendChild(logoutButton);
// add logout listener
    logoutButton.addEventListener('click', this.maqawManager.logoutClicked, false);

// create dashboard for logged in users
    var loggedInDashboard = document.createElement('DIV');
    loggedInDashboard.id = 'maqaw-logged-in-dashboard';
    loggedInWindow.appendChild(loggedInDashboard);

// create title for dashboard
    var dashboardTitle = document.createElement('DIV');
    dashboardTitle.id = 'maqaw-dashboard-title';
    dashboardTitle.innerHTML = 'Visitors';
    loggedInDashboard.appendChild(dashboardTitle);

// div to hold table of visitors
    var visitorListContainer = document.createElement('DIV');
    visitorListContainer.id = 'maqaw-visitor-list-container';
    loggedInDashboard.appendChild(visitorListContainer);

    // create new chat manager
    this.chatManager = new MaqawChatManager(chatSessions);

    // create new visitor list

    this.visitorList = new MaqawVisitorList(visitorListContainer, this.chatManager, this.maqawManager);

    // takes an array of ids representing visitors on the site
    this.updateVisitorList = function(visitors){
        // pass the list along to the MaqawVisitorList so it can take care of updates
        that.visitorList.setVisitorList(visitors);
    }

    // takes an object created by getSessionData and attempts to restore
    // that session
    this.loadSessionData = function(sessionData){
         that.visitorList.loadListData(sessionData);
    }

    // returns an object representing the state of this session
    this.getSessionData = function(){
        // the only thing that really matters is the information on the visitors in the list
         return that.visitorList.getListData();
    }
}

MaqawRepSession.prototype.getBodyContents = function() {
    return this.body;
};

MaqawRepSession.prototype.getHeaderContents = function() {
    return this.header;
};

// A visitor object contains all the data describing a visitor
// on the site who is accessible for chat
// name - visitor name
// key - webrtc chat key
// chatDisplayContainer - the div that will show the visitors chat session
function MaqawVisitor(manager, name, id, connectionCallback) {

    var that = this;
    this.name = name;
    this.id = id;

    // each visitor has a unique chat session
    this.chatSession = new MaqawChatSession(document.createElement("DIV"), manager.peer, 'You', name, id, connectionCallback);

    this.getChatSession = function() {
        return that.chatSession;
    };

    this.getId = function(){
        return that.id;
    };
}/*
 VisitorList manages all current visitors and displays the list in a table
 listDisplayContainer - The div that will contain the table of visitors
 chatManager - the ChatManager object that will manage chat sessions
 */
function MaqawVisitorList(listDisplayContainer, chatManager, maqawManager) {
    var that = this;
    // hashmap of all visitors on the site. Their id is the key, and their visitor object the value
    this.visitors = {};
    this.listDisplayContainer = listDisplayContainer;
    this.chatManager = chatManager;
    this.maqawManager = maqawManager;
    // a visitor wrapper object representing the visitor that is selected in the table
    this.selectedVisitor;
    this.visitorCounter = 1;

    // create table of visitors
    this.table = document.createElement('table');
    this.table.id = 'maqaw-visitor-list-table';
    this.tBody = document.createElement('tbody');
    this.table.appendChild(this.tBody);
    this.listDisplayContainer.appendChild(this.table);

    // takes an array of ids of visitors that are on the site
    // checks which of the ids are new, which already exist, and which previous ids aren't active any more
    // the visitor display is updated accordingly
    // visitorIds - an array of ids of visitors on the site
    this.setVisitorList = function (visitorIds) {
        if (visitorIds) {
            // go through each id in the list
            for (var i = 0; i < visitorIds.length; i++) {
                var id = visitorIds[i];
                // check for a visitor with this id
                var visitor = that.visitors[id];
                // if one doesn't exist, create one
                if (typeof visitor === 'undefined') {
                    that.visitors[id] = createNewVisitorWithWrapper(id);
                }
                // otherwise make sure the visitor has an open connection
                else if (!visitor.getIsConnected()) {
                    visitor.setServerConnectionStatus(true);
                }

            }
        }

        // check for current connections that are no longer active
        // Ff the connection is marked as active but we didnt' get an id
        // for it from the server it means the peer disconnected
        // this could be just a page change or refresh, but the connection
        // will be re-established when they make connect with the server again
        // TODO: More efficient way of finding disconnected peers
        for (var visitorId in that.visitors) {
            var isConnected = false;
            for (i = 0; i < visitorIds.length; i++) {
                if (visitorId === visitorIds[i]) {
                    isConnected = true;
                    break;
                }
            }

            // if there are no matching ids for this visitor we need to disconnect them
            if (!isConnected) {
                that.visitors[visitorId].setServerConnectionStatus(false);
            }
        }
    };

    // create a new visitor using the specified id, and wrap the visitor in a MaqawVisitorWrapper object
    // to help manage selecting and displaying the visitor
    function createNewVisitorWithWrapper(id) {
        var visitorName = 'Visitor ' + that.visitorCounter;
        that.visitorCounter++;
        // use rowIndex of -1 so the row is added at the end of the table
        return new MaqawVisitorWrapper(id, visitorName, that, -1);
    }

    this.setSelectedVisitor = function (visitorWrapper) {
        // deselect previously selected row, if there is one
        if (that.selectedVisitor) {
            that.selectedVisitor.deselect();

            // if the previously selected visitor was selected again, leave it deselected
            if (that.selectedVisitor === visitorWrapper) {
                that.selectedVisitor = undefined;
                return;
            }
        }

        // set new visitor to be selected
        visitorWrapper.select();

        // save visitor
        that.selectedVisitor = visitorWrapper;
    };


    // a visitorwrapper calls this to tell the MaqawVisitorList that it is going inactive
    // the visitor list needs to make sure that it doesn't have this visitor set
    // as selected
    this.hideVisitor = function (visitorWrapper) {
        if (that.selectedVisitor && that.selectedVisitor === visitorWrapper) {
            that.selectedVisitor = undefined;
        }
    }

    // return the an object representing the state of this visitorList
    this.getListData = function () {
        var data = {};
        // create an entry for each visitor
        var counter = 0;
        for (var visitorId in that.visitors) {
            var visitorWrapper = that.visitors[visitorId];
            // save the data that is important to state
            var visitorData = {
                name: visitorWrapper.visitor.name,
                id: visitorWrapper.getId(),
                isSelected: visitorWrapper.isSelected,
                rowIndex: visitorWrapper.row.rowIndex,
                chatText: visitorWrapper.visitor.getChatSession().getText()
            }
            data[counter] = visitorData;
            counter++;
        }
        return data;
    }

    // load a state represented by an object from getListData
    this.loadListData = function (listData) {
          // start by clearing any existing visitors and the visitor table
        that.visitors = {};
        that.tBody.innerHTML = '';

        // set the visitor counter to be the number of visitors stored
        that.visitorCounter = listData.length;

        // go through each entry in the list data and restore it
        for(var index in listData){
            var dataObject = listData[index];
            // create and update a visitorWrapper using this data
            // ideally we would like the visitors to show up in the same order in the table, but right now
            // we just append it to the end by passing rowIndex of -1

            var visitorWrapper = new MaqawVisitorWrapper(dataObject['id'], dataObject['name'], that, -1);

            if(dataObject['isSelected']) {
                that.selectedVisitor = visitorWrapper;
                visitorWrapper.select();
            }

            // load the chat history
            visitorWrapper.visitor.getChatSession().setText(dataObject['chatText']);

            // save this visitor in the list
            that.visitors[visitorWrapper.getId()] = visitorWrapper;
        }
    }
}


// this wrapper class monitors the status of a visitor

function MaqawVisitorWrapper(id, name, visitorList, rowIndex) {
    var that = this;
    this.visitorList = visitorList;

    // whether or not this visitor is connected to the peerserver. This will fluctuate briefly
    // if they change or reload pages. If that happens we need to tell the chat session to restart
    // its connection with this visitor
    this.isConnectedToServer = true;

    // the status of the chat session's connection with the visitor. This is subtly different
    // from the visitors connection with the server. The server will
    // immediately detect if the visitor changes pages, however, the chat
    // connection takes five seconds to notice.
    this.isChatConnected = false;


    this.visitor = new MaqawVisitor(this.visitorList.maqawManager, name, id, visitorConnectionCallback);

    // create row to display this visitor in the table
    this.row = visitorList.table.insertRow(rowIndex);
    this.row.className = 'maqaw-visitor-list-entry';
    // the row contains a single cell containing the visitor name
    var cell = document.createElement("td");
    var cellText = document.createTextNode(this.visitor.name);
    cell.appendChild(cellText);
    this.row.appendChild(cell);

    // append row to the visitor table
    this.visitorList.tBody.appendChild(this.row);

    this.isSelected = false;

    // append click listener to row
    this.row.addEventListener('click', clickCallBack, false);
    function clickCallBack() {
        that.visitorList.setSelectedVisitor(that);
    }


    // set the row to be hidden at first until it's visitor's chat session is established
    hide();

    // this visitor's row in the table is set to selected
    this.select = function () {
        that.isSelected = true;
        // change class to selected
        that.row.className = 'maqaw-selected-visitor';
        // show visitor chat window
        that.visitorList.chatManager.showVisitorChat(that.visitor)
    };

    // the row is set to deselected
    this.deselect = function () {
        that.isSelected = false;
        // change class to default
        that.row.className = 'maqaw-visitor-list-entry';
        // clear chat window
        that.visitorList.chatManager.clear(that.visitor);
    };

    this.getVisitor = function () {
        return that.visitor;
    };

    this.getId = function () {
        return that.visitor.getId();
    };

    // whether or not this visitor is connected to the server.
    this.getIsConnected = function () {
        return that.isConnectedToServer;
    };

    // tells the visitors chat session to open it's connection. The chat session will
    // only do this if it's connection has been closed. if it succeeds in reopening the
    // connection it will call the visitorConnectionCallback function
    this.openConnection = function () {
        that.visitor.getChatSession().openConnection();
    };

    // set whether or not this visitor is connected to the peer server
    this.setServerConnectionStatus = function (isConnected) {
        // if the visitor switched from disconnected to connected, tell the chat session
        // to reconnect with the visitor
        if (!that.isConnectedToServer && isConnected) {
            that.visitor.getChatSession().openConnection();
        }

        // save the connection status
        that.isConnectedToServer = isConnected;

        // if they are disconnected, tell the chat session to disallow sending messages
        updateChatSending();
    };

    // tells the chat session whether or not they should allow messages to be sent by the rep
    // if either the visitor is not currently connected to the server, or the chat connection
    // is broken, messages should be prevented
    function updateChatSending() {
        that.visitor.chatSession.setAllowMessageSending(that.isConnectedToServer && that.isChatConnected);
    }

    // the visitor's chat session calls this function whenever the chat connection
    // status changes. A bool representing the new status is passed in, with true for
    // connected and false for disconnected
    function visitorConnectionCallback(isConnected) {
        that.isChatConnected = isConnected;
        updateChatSending();

        // update row display to reflect connection status
        if (!that.isChatConnected) {
            hide();
        } else {
            show();
        }
    }

    function hide() {
        that.row.style.display = 'none';
        that.visitorList.hideVisitor(that);
        that.isSelected = false;
        // change class to default
        that.row.className = 'maqaw-visitor-list-entry';
        // clear chat window
        that.visitorList.chatManager.clear(that.visitor);
    }

    function show() {
        that.row.style.display = 'block';
    }
}
/*
 This file generates a Maqaw client that can be loaded onto a site
 */

// start by creating the display
// pass true to start the client minimized, or false to default to maximize
var maqawDisplay = new MaqawDisplay(true);
maqawDisplay.setup();

// Initialize the MaqawManager to deal with clients and representatives
var maqawManager = new MaqawManager(maqawOptions, maqawDisplay);

// start a visitor session
maqawManager.startVisitorSession();

// try to restore a previously logged in rep session if one exists

var maqawRepSessionStarted = maqawManager.loadRepSession();

// if no rep session could be loaded, display the visitor session
if(!maqawRepSessionStarted){
    maqawManager.showVisitorSession();
}

