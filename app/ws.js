/**
 * Websockets
 */

module.exports = function(io) {
  var peers = [],
      sockets = [],
      dataConnections = [];

  io.set('log level', 0);

  // Add a new socket
  function addPeer(peer, peerSocket) {
    peers.push(peer);
    sockets.push(peerSocket);

    if (peer.representative) {
      // get back list of visitors
      peerSocket.socket.emit('visitors', peers.filter(function(el) {
        return !el.representative;
      }));

    } else {
      // get back list of reps
      peerSocket.socket.emit('representatives', peers.filter(function(el) {
        return el.representative;
      }));

      // let all reps know you exist
      var representatives = sockets.filter(function(el) {
        return el.representative;
      });
      for (var i = 0; i < representatives.length; i++) {
        representatives[i].socket.emit('visitors', peers.filter(function(el) {
          return !el.representative;
        }));
      }
    }
  }

  io.sockets.on('connection', function(socket) {

    // Initialize the connection
    socket.on('init connect', function(data) {
      if (!data.id) data.id = 9999; // Generate ID for user
      socket.peerId = data.id;

      socket.emit('peer open', data.id);

      var peerSocket = { id: data.id, representative: data.representative, socket: socket };
      addPeer(data, peerSocket);

    });

    // Start a data connection
    socket.on('connect', function(data) {
      var src = peers._findById(data.src);
      var dst = peers._findById(data.dst);

      var oneWay = { src: src, dst: dst };
      var otherWay = { src: dst, dst: src };

      dataConnections.push(oneWay);
      dataConnections.push(otherWay);

      var dstSocket = sockets._findById(data.dst).socket;
      dstSocket.emit('connection', otherWay);

      var srcSocket = sockets._findById(data.src).socket;
      srcSocket.emit('connection open');

    });

    // Send message through a data connection
    socket.on('send', function(data) {
      var src = data.src;
      var dataConnection = dataConnections._findBySrcId(src);
      var dst = dataConnection.dst;
      var dstSocket = sockets._findById(dst.id).socket;
      console.log("We are sending a message to: " + dst.id);
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
          peerSocket.emit('representatives', peers.filter(function(el) {
            return el.representative;
          }));
        } else {
          peerSocket.socket.emit('visitors', peers.filter(function(el) {
            return !el.representative;
          }));
        }
      });
    })
  });

  // Find an element in an array (use underscore function??)
  Array.prototype._findById = function (id) {
    for (var i = 0; i < this.length; i++) {
      if (this[i].id == id) return this[i];
    }
  };

  // Find an element by the src id
  Array.prototype._findBySrcId = function(id) {
    for (var i = 0; i < this.length; i++) {
      if (this[i].src.id == id) return this[i];
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