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
        console.log(representativeSocket);
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
      console.log("peers");
      console.log(peers);
      console.log("data");
      console.log(data);

      if (!data.dst) {
        console.log("destination does not exist");
        socket.emit('error', { msg: 'Could not connect to peer' });
      } else {
        console.log("destination exists");
        var oneWay = { src: data.src, dst: data.dst };
        var otherWay = { src: data.dst, dst: data.src };

        dataConnections.push(oneWay);
        dataConnections.push(otherWay);

        var srcSocket = sockets._findById(data.src).socket;

        if (!sockets._findById(data.dst)) {
          console.log("no destination found");
          emitVisitors();

        } else {
          console.log("destination found");
          var dstSocket = sockets._findById(data.dst).socket;
          dstSocket.emit('connection', otherWay);
          srcSocket.emit('connection open');
        }


      }

    });

    // Send message through a data connection
    socket.on('send', function(data) {
      console.log("data inside of send");
      console.log(data);
      var src = data.src;
      var dataConnection = dataConnections._findBySrcId(src);
      console.log("dataConnections");
      console.log(dataConnections);
      console.log("dataConnection");
      console.log(dataConnection);
      var dstId = dataConnection.dst;
      console.log("dst");
      var dstSocket = sockets._findById(dstId).socket;
      console.log("We are sending a message to: " + dstId);
      console.log("The message looks like:");
      console.log(data.message);
      dstSocket.emit('data', data.message);
    });

    // Send error notification
    socket.on('error', function() {
      socket.emit('error', 'An error has occurred');
    });

    // Send close notification
    socket.on('disconnect', function() {
      console.log("firing disconnect event");
      var peerId = socket.peerId;
      var removedConnection = false;

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
    })
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

  // Get the list of representatives
  /*
  function getRepresentatives() {
    var representatives = peers.filter(function(el) {
      return el.representative;
    });
    console.log("the reps looks like");
    console.log(Array.toIds(representatives));
    return Array.toIds(representatives); 
  }
  */

  // Get the list of visitors
  /*
  function getVisitors() {
    var visitors = peers.filter(function(el) {
      return !el.representative;
    });
    console.log("the visitors looks like");
    console.log(Array.toIds(visitors));
    return Array.toIds(visitors);
  }
  */

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