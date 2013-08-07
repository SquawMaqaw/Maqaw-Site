/**
 * Websockets
 */

exports.assignToRepresentative = function(id) {
  for (var i = 0; i < peers.length; i++) {
    if (peers[i].id == id) peers[i].representative = true;
  }

  for (var i = 0; i < sockets.length; i++) {
    var representatives = peers.filter(function(el) {
      return el.representative;
    }) || [];

    sockets[i].socket.emit('representatives', { msg: Array.toIds(representatives) });
    //emitRepresentatives(sockets[i].socket);
  }
};

exports.initWS = function(io) {
  peers = [];
  sockets = [];
  dataConnections = [];

  io.set('log level', 0);

  // Debug
  function logging() {
    console.log("peers:");
    console.log(peers);
    console.log("dataConnections");
    console.log(dataConnections);
    console.log("sockets");
    console.log(sockets);
  }

  // Add a new socket
  function addPeer(peer, peerSocket) {
    console.log("inside of addPeer");
    peers.push(peer);
    sockets.push(peerSocket);

    if (peer.representative) {
      // get back list of visitors
      console.log("the peer is a rep, so emit visitors")
      emitVisitors(peerSocket.socket);
      console.log("finished emitting visitors");
      //peerSocket.socket.emit('visitors', { msg: visitors });

    } else {
      // get back list of reps
      //peerSocket.socket.emit('representatives', { msg: representatives });
      console.log("get back a list of reps");
      emitRepresentatives(peerSocket.socket);

      var representatives = peers.filter(function(el) {
        return el.representative;
      });
      console.log("here is the list of reps");
      console.log(representatives);
      // let all reps know you exist
      for (var i = 0; i < representatives.length; i++) {
        var representativeSocket = sockets._findById(representatives[i].id);
        console.log("here is what the representative socket looks lik");
        if (representativeSocket) {
          emitVisitors(representativeSocket.socket);
          //representativeSocket.socket.emit('visitors', { msg: visitors });
        }
      }


    }
  }

  io.sockets.on('connection', function(socket) {

    // Initialize the connection
    socket.on('init connect', function(data) {
      if (!data.id) data.id = generateID(); // Generate ID for user
      socket.peerId = data.id;

      socket.emit('peer open', data.id);

      var peerSocket = { id: data.id, representative: data.representative, socket: socket };
      addPeer(data, peerSocket);

    });

    // Start a data connection
    socket.on('connect', function(data) {
      console.log("inside connect");
      console.log("data");
      console.log(data);

      if (!data.dst) {
        console.log("destination does not exist");
        socket.emit('error', { msg: 'Could not connect to peer' });
      } else {

        var srcSocket = sockets._findById(data.src).socket;

        if (!sockets._findById(data.dst) || data.src == data.dst) {
          console.log("no destination found");
          emitVisitors(srcSocket);

        } else {
          console.log("destination found");

          var oneWay = { src: data.src, dst: data.dst };
          var otherWay = { src: data.dst, dst: data.src };

          dataConnections.push(oneWay);
          dataConnections.push(otherWay);

          var dstSocket = sockets._findById(data.dst).socket;
          dstSocket.emit('connection', otherWay);
          dstSocket.emit('connection open', otherWay);
          console.log("sending a connection open event");
          srcSocket.emit('connection open', oneWay);
        }


      }

    });

    // Send message through a data connection
    socket.on('send', function(data) {
      var dstSocket = sockets._findById(data.dst).socket;
      console.log("We are sending a message to: " + data.dst);
      console.log("The message looks like:");
      console.log(data.message);
      dstSocket.emit('data', { src: data.src, dst: data.dst, type: data.message.type, text: data.message.text });
    });

    // Send error notification
    socket.on('error', function() {
      socket.emit('error', 'An error has occurred');
    });

    // Send close notification
    socket.on('close', function(data) {
      console.log("closing src data connection");
      socket.emit('close', { src: data.src, dst: data.dst });
      console.log("closing dst data connection if exists");
      if (sockets._findById(data.dst)) {
        var dstSocket = sockets._findById(data.dst).socket;
        dstSocket.emit('close', { src: data.dst, dst: data.src });
      }
    });

    // Send disconnect notification
    socket.on('disconnect', function() {
      console.log("firing disconnect event");
      var peerId = socket.peerId;
      var removedConnection = false;

      if (peers._findById(peerId)) {
        dataConnections._removeConn(peerId, function(connectedTo) {
          connectedTo.emit('close', { message: 'User disconnected' });
        });

        var removed = peers._removePeer(peerId);
        sockets._removePeer(peerId);

        sockets._forEach(function(peerSocket) {
          if (removed.representative) {
            emitRepresentatives(peerSocket.socket);
          } else {
            emitVisitors(peerSocket.socket);
          }
        });
      }

    });
  });

  // Generate a random ID
  function generateID() {
    console.log("inside generate id");
    return Math.random().toString(36).substr(2);
  }

  // Emit the list of visitors
  function emitVisitors(socket) {
    var visitors = peers.filter(function(el) {
      return !el.representative;
    });
    var visitorIds = Array.toIds(visitors);
    console.log("visitors");
    console.log(visitors);
    console.log("visitorIds");
    console.log(visitorIds);
    socket.emit('visitors', { msg: visitorIds });
  }

  // Emit the list of representatives
  function emitRepresentatives(socket) {
    var representatives = peers.filter(function(el) {
      return el.representative;
    });
    var representativeIds = Array.toIds(representatives);
    console.log("repIds");
    console.log(representativeIds);
    socket.emit('representatives', {msg: representativeIds });
  }

  // Convert an array of objects with IDs
  // into an array of just IDs
  Array.toIds = function(arr) {
    var newArr = [];
    for (var i = 0; i < arr.length; i++) {
      newArr.push(arr[i].id);
    }
    return newArr;
  }


  // Find an element in an array (use underscore function??)
  Array.prototype._findById = function (id) {
    for (var i = 0; i < this.length; i++) {
      if (this[i].id == id) return this[i];
    }
  };

  // Find an element by the src id
  Array.prototype._findBySrcId = function(id) {
    for (var i = 0; i < this.length; i++) {
      if (this[i].src == id) return this[i];
    }
  };

  // Remove an element in an array with a certain ID
  Array.prototype._removePeer = function(id, cb) {
    var removed;
    for (var i = this.length - 1; i >= 0; i--) {
      if (this[i].id == id) {
        removed = this[i]
        this.splice(i, 1);
      }
    }
    return removed;
  };

  // Remove an element in an array with data connections
  Array.prototype._removeConn = function(id, cb) {
    for (var i = this.length - 1; i >= 0; i--) {
      if (this[i].src.id == id && cb) {
        var dstSocket = sockets._findById(this[i].dst.id).socket;
        cb(dstSocket);
      }

      if (this[i].src.id == id || this[i].dst.id == id) this.splice(i, 1);
    }
  }

  // Asynch for each with callback
  Array.prototype._forEach = function(cb) {
    for (var i = 0; i < this.length; i++) {
      cb(this[i]);
    }
  }
};