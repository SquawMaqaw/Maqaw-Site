/**
 * Websockets
 */

var _  = require('underscore');

exports.assignToRepresentative = function(id) {
  peers[id].representative = true;

  var visitors = _.filter(peers, function(el) {
    return !el.representative;
  });
  
  var visitorIds = _.map(visitors, function(visitor){ return visitor.id });
  //peers[id].socket.emit('visitors', {msg: visitorIds });
};

exports.initWS = function(io) {
  peers = {};
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
  function addPeer(peer) {
    // MISNAMED ~~~~~////
    if (peer.representative) {
      // get back list of visitors
      emitVisitors(peer.socket);
    } else {
      // get back list of reps
      emitRepresentatives(peer.socket);
      var representatives = _.where(peers, { representative: true });
      // let all reps know you exist
      _.each(representatives, function(representative) {
        emitVisitors(representative.socket); 
      }); 
    }
  }

  io.sockets.on('connection', function(socket) {

    // Initialize the connection
    socket.on('init connect', function(data) {
      if (!data.id) {
        data.id = generateID(); // Generate ID for user
      }
      socket.emit('peer open', data.id);
      socket.peerId = data.id;
      peers[data.id] = { 
        id: data.id, 
        representative: data.representative, 
        socket: socket, 
        connections: []
      };

      addPeer(peers[data.id]);
    });

    // Start a data connection
    socket.on('connect', function(data) {

      if (!data.dst) {
        socket.emit('error', { msg: 'Could not connect to peer' });
      } else {

        var srcPeerObject = peers[data.src]; 
        var srcSocket = srcPeerObject.socket;
        var dstPeerObject = peers[data.dst];

        if (!dstPeerObject || data.src === data.dst) {
          // Re emit the visitors list 
          emitVisitors(srcSocket);
        } else {
          
          // Add two way connection to the connection objects
          peers[data.src].connections.push(data.dst);
          peers[data.dst].connections.push(data.src); 
          
          var dstSocket = dstPeerObject.socket 

          dstSocket.emit('connection', {src: data.dst, dst: data.src });
          dstSocket.emit('connection open', {src: data.dst, dst: data.src });

          srcSocket.emit('connection open', {src: data.src, dst: data.dst });
        }
      }
    });

    socket.on('poll', function(data) {
      if (data === 'VISITORS') {
        emitVisitors(socket);
      }
    });

    // Send message through a data connection
    socket.on('send', function(data) {
      var dstSocket = peers[data.dst].socket;
      dstSocket.emit('data', { src: data.src, dst: data.dst, type: data.message.type, text: data.message.text });
      console.log("peers");
      console.log(peers);
    });

    // Send error notification
    socket.on('error', function() {
      socket.emit('error', 'An error has occurred');
    });

    // Send close notification
    socket.on('close', function(data) {
      //socket.emit('close', { src: data.src, dst: data.dst });
      var dstPeerObject = _.findWhere(peers, data.dst); 
      console.log("after findWhere");
      console.log(peers);
      console.log("the dst peer is");
      console.log(data.dst);

      if (dstPeerObject) {
        var dstSocket = dstPeerObject.socket;
        //dstSocket.emit('close', { src: data.dst, dst: data.src });
      }
    });

    // Send disconnect notification
    socket.on('disconnect', function() {
      console.log("firing disconnect event");
      var peerId = socket.peerId;
      var removedConnection = false;

      var peer = peers[socket.peerId];
      var peerConnections = peer.connections;    

      // Send each peer connection a close event
      _.each(peerConnections, function(connection) {
          var peerConnection = peers[connection];

          //peerConnection.socket.emit('close', { data: { src: peerId, dst: connection }});
          //peer.socket.emit('close', { data: { src: connection, dst: peerId }});
          peerConnection.connections = _.without(peerConnection.connections, peerId);
           
      });
             
      peers = _.omit(peers, peerId); 

      _.each(peer.connections, function(peerConnection) {
        if (peer.representative) {
          emitRepresentatives(peers[peerConnection].socket);
        } else {
          emitVisitors(peers[peerConnection].socket);
        }
      });   



    });
  });

  // Generate a random ID
  function generateID() {
    console.log("inside generate id");
    return Math.random().toString(36).substr(2);
  }

  // Emit the list of visitors
  function emitVisitors(socket) {

    var visitors = _.filter(peers, function(el) {
      return !el.representative;
    });

    var visitorIds = _.map(visitors, function(visitor){ return visitor.id });
    socket.emit('visitors', { msg: visitorIds });
  }

  // Emit the list of representatives
  function emitRepresentatives(socket) {
    var representatives = _.filter(peers, function(el) {
      return el.representative;
    });
    
    var representativeIds = _.map(representatives, function(rep){ return rep.id });
    socket.emit('representatives', {msg: representativeIds });
  }
};
