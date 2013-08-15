var MAQAW_MIRROR_ENUMS = {
  SHARE_SCREEN: 0, 
  SHARE_SCREEN_OK: 1,
  SHARE_SCREEN_REFUSE: 2,
  SCREEN_DATA: 3,
  MOUSE_MOVE: 4,
  MOUSE_CLICK: 5,
  SCROLL: 6,
  INPUT: 7,
  SIZE_REQUEST: 8,
  SIZE: 9
};

function Mirror(options) {
  // stores connection object if exists
  this.conn = options && options.conn;
  this.base;

  this.mirrorDocument;
  this.mirrorWindow;
  this.mouseMirror;
  this.inputMirror;

  // whether or not we are currently viewing our peer's screen
  this.isViewingScreen = false;

}

/*
 * Called when the connection to our peer is reset
 */
Mirror.prototype.connectionReset = function () {
   // if we were watching our peer's screen, tell that to start sending screen
   //data again
    if(this.mirrorWindow && !this.mirrorWindow.closed){
        this.requestScreen();
    }
};

Mirror.prototype.data = function(_data) {
  //
  // handle new data. For a new share screen
  // request, function opens a new mirror
  // for all other requests, function passes
  // data to mirrorScreen
  //
  switch(_data.request) {
    case MAQAW_MIRROR_ENUMS.SHARE_SCREEN:
      // Request from peer to view this screen  
      this.conn.send({ type: MAQAW_DATA_TYPE.SCREEN, request: MAQAW_MIRROR_ENUMS.SHARE_SCREEN_OK });
      this.shareScreen();
      break;
    case MAQAW_MIRROR_ENUMS.SHARE_SCREEN_OK:
      //  Share screen request received and 
      //  validated open a screen mirror 
      this.openMirror();
      break;
    case MAQAW_MIRROR_ENUMS.SCREEN_DATA:
      //  Screen Data.
    case MAQAW_MIRROR_ENUMS.MOUSE_CLICK:
      // Mouse click event
    case MAQAW_MIRROR_ENUMS.MOUSE_MOVE:
      // Mouse move event
    case MAQAW_MIRROR_ENUMS.INPUT:
      // Interactions with input elements
      this.mirrorScreen(_data);  
      break;
    case MAQAW_MIRROR_ENUMS.SCROLL:
      this.mirrorWindow.scrollTo(_data.left, _data.top);
      break;
    case MAQAW_MIRROR_ENUMS.SIZE:
      this.mirrorDocument.body.style.width = _data.width;
      break;
    case MAQAW_MIRROR_ENUMS.SIZE_REQUEST:
      this.conn.send({
        type: MAQAW_DATA_TYPE.SCREEN,
        request: MAQAW_MIRROR_ENUMS.SIZE,
        width: document.body.clientWidth
      });
      break;
    default:
      // Unknown
      break;
  }
};

Mirror.prototype.openMirror = function() {
  var _this = this;

  // if we are already viewing the screen, don't open a new window
    if(!this.isViewingScreen) {
         this.mirrorWindow = window.open();
         this.mirrorDocument = this.mirrorWindow.document;

        // attach a listener for if the window is closed
        this.mirrorWindow.addEventListener('unload', function() {
            // TODO: implement me
            _this.isViewingScreen = false;
        }, false);

        // request dimensions for body
        _this.conn.send({
            type: MAQAW_DATA_TYPE.SCREEN,
            request: MAQAW_MIRROR_ENUMS.SIZE_REQUEST
        });

    }

    this.isViewingScreen = true;

  this._mirror = new TreeMirror(this.mirrorDocument, {
    createElement: function(tagName) {
      if (tagName == 'SCRIPT') {
        var node = _this.mirrorDocument.createElement('NO-SCRIPT');
        node.style.display = 'none';
        return node;
      }

      if (tagName == 'HEAD') {
        var node = _this.mirrorDocument.createElement('HEAD');
        node.appendChild(_this.mirrorDocument.createElement('BASE'));
        node.firstChild.href = _this.base;
        return node;
      }
    }
  });
  
  this.mouseMirror = new MouseMirror(this.mirrorDocument, {
    mousemove: function(event) {
      _this.conn.send({
        type: MAQAW_DATA_TYPE.SCREEN,
        request: MAQAW_MIRROR_ENUMS.MOUSE_MOVE,
        coords: {x: event.pageX, y: event.pageY}
      });
    }, 
    click: function(event) {
        _this.conn.send({
            type: MAQAW_DATA_TYPE.SCREEN,
            request: MAQAW_MIRROR_ENUMS.MOUSE_CLICK,
            coords: {x: event.pageX, y: event.pageY},
            target: maqawGetNodeHierarchy(_this.mirrorDocument, event.target)
        });
    },
    rep: true
  });

  this.inputMirror = new MaqawInputMirror(this.mirrorDocument, {
      multipleSelect: function(){
          // get list of selected options
          var selectedOptions = [];
          for(var j = 0; j < this.selectedOptions.length; j++){
              selectedOptions.push(this.selectedOptions[j].text);
          }
          _this.conn.send({
              type: MAQAW_DATA_TYPE.SCREEN,
              request: MAQAW_MIRROR_ENUMS.INPUT,
              index: maqawGetNodeHierarchy(_this.mirrorDocument, this),
              selectedOptions: selectedOptions
          });
      },
      singleSelect: function(){
          _this.conn.send({
              type: MAQAW_DATA_TYPE.SCREEN,
              request: MAQAW_MIRROR_ENUMS.INPUT,
              index: maqawGetNodeHierarchy(_this.mirrorDocument, this),
              selectedIndex: this.selectedIndex
          });
      }
          ,
      inputDefault: function(){
          _this.conn.send({
              type: MAQAW_DATA_TYPE.SCREEN,
              request: MAQAW_MIRROR_ENUMS.INPUT,
              index: maqawGetNodeHierarchy(_this.mirrorDocument, this),
              text: this.value
          });
      }
          ,
      radioAndCheckbox: function(){
          _this.conn.send({
              type: MAQAW_DATA_TYPE.SCREEN,
              request: MAQAW_MIRROR_ENUMS.INPUT,
              index: maqawGetNodeHierarchy(_this.mirrorDocument, this),
              checked: this.checked
          });
      }
  });
};

Mirror.prototype.setConnection = function(conn) {
  // set a connection if established later
  this.conn = conn;
};

Mirror.prototype.requestScreen = function() {
  //
  //  Sends share screen request to peer
  //
  if (this.conn) {
    this.conn.send({ 
      type: MAQAW_DATA_TYPE.SCREEN,
      request: MAQAW_MIRROR_ENUMS.SHARE_SCREEN
    });
  }
};

Mirror.prototype.shareScreen = function() {
  //
  // streams screen to peer
  //
  var _this = this;
  if (this.conn) {

    this.conn.send({
      type: MAQAW_DATA_TYPE.SCREEN,
      request: MAQAW_MIRROR_ENUMS.SCREEN_DATA,
      clear: true 
    });

    this.conn.send({
      type: MAQAW_DATA_TYPE.SCREEN,
      request: MAQAW_MIRROR_ENUMS.SCREEN_DATA,
      base: location.href.match(/^(.*\/)[^\/]*$/)[1] 
    });

    var mirrorClient = new TreeMirrorClient(document, {

      initialize: function(rootId, children) {
        _this.conn.send({
          type: MAQAW_DATA_TYPE.SCREEN,
          request: MAQAW_MIRROR_ENUMS.SCREEN_DATA,
          f: 'initialize',
          args: [rootId, children]
        });
      },

      applyChanged: function(removed, addedOrMoved, attributes, text) {
        _this.conn.send({
          type: MAQAW_DATA_TYPE.SCREEN,
          request: MAQAW_MIRROR_ENUMS.SCREEN_DATA,
          f: 'applyChanged',
          args: [removed, addedOrMoved, attributes, text]
        });
      }
    });

    // remove old mouse mirror if applicable so there isn't a duplicate cursor
    // from two screen sharing sessions

    this.mouseMirror = new MouseMirror(document, {
      mousemove: function(event) {
        _this.conn.send({ 
          type: MAQAW_DATA_TYPE.SCREEN,
          request: MAQAW_MIRROR_ENUMS.MOUSE_MOVE,
          coords: {x: event.pageX, y: event.pageY}
        });
      }, 
      click: function(event) {
          _this.conn.send({
              type: MAQAW_DATA_TYPE.SCREEN,
              request: MAQAW_MIRROR_ENUMS.MOUSE_CLICK,
              coords: {x: event.pageX, y: event.pageY},
              target: maqawGetNodeHierarchy(document, event.target)
          });
      }
    });
  
    // Set up scroll listener
    window.addEventListener('scroll', scrollListener, false);
    function scrollListener(){
      var top = window.pageYOffset;
      var left = window.pageXOffset;
      _this.conn.send({
        type: MAQAW_DATA_TYPE.SCREEN,
        request: MAQAW_MIRROR_ENUMS.SCROLL,
        top: top,
        left: left
      });
    }



    /* Set up listeners to input events */
      this.inputMirror = new MaqawInputMirror(document, {
          multipleSelect: function(){
              // get list of selected options
              var selectedOptions = [];
              for(var j = 0; j < this.selectedOptions.length; j++){
                  selectedOptions.push(this.selectedOptions[j].text);
              }
              _this.conn.send({
                  type: MAQAW_DATA_TYPE.SCREEN,
                  request: MAQAW_MIRROR_ENUMS.INPUT,
                  index: maqawGetNodeHierarchy(document, this),
                  selectedOptions: selectedOptions
              });
          },
          singleSelect: function(){
              _this.conn.send({
                  type: MAQAW_DATA_TYPE.SCREEN,
                  request: MAQAW_MIRROR_ENUMS.INPUT,
                  index: maqawGetNodeHierarchy(document, this),
                  selectedIndex: this.selectedIndex
              });
          }
          ,
          inputDefault: function(){
              _this.conn.send({
                  type: MAQAW_DATA_TYPE.SCREEN,
                  request: MAQAW_MIRROR_ENUMS.INPUT,
                  index: maqawGetNodeHierarchy(document, this),
                  text: this.value
              });
          }
          ,
          radioAndCheckbox: function(){
              _this.conn.send({
                  type: MAQAW_DATA_TYPE.SCREEN,
                  request: MAQAW_MIRROR_ENUMS.INPUT,
                  index: maqawGetNodeHierarchy(document, this),
                  checked: this.checked
              });
          }
      });

      // listener for window resize
      var oldResize = window.onresize;
      function newResize (){
          _this.conn.send({
              type: MAQAW_DATA_TYPE.SCREEN,
              request: MAQAW_MIRROR_ENUMS.SIZE,
              width: document.body.clientWidth
          });

          // call the old resize function as well if we overwrote one
          if(oldResize){
              oldResize();
          }
      }
      window.onresize = newResize;

  } else {
    console.log("Error: Connection not established. Unable to stream screen");
  }
};

Mirror.prototype.mirrorScreen = function(data) {
  var _this = this;

  function clearPage() {
    // clear page //
    while (_this.mirrorDocument.firstChild) {
      _this.mirrorDocument.removeChild(_this.mirrorDocument.firstChild);
    }
  }

  function handleMessage(msg) {
    if (msg.clear){
      clearPage();
    }
    else if (msg.base){
      _this.base = msg.base;
    }
    else if (msg.request === MAQAW_MIRROR_ENUMS.SCREEN_DATA){
      _this._mirror[msg.f].apply(_this._mirror, msg.args);
    }
    else if (msg.request === MAQAW_MIRROR_ENUMS.MOUSE_MOVE || msg.request === MAQAW_MIRROR_ENUMS.MOUSE_CLICK){
        _this.mouseMirror.data(msg);
    }
    else if (msg.request === MAQAW_MIRROR_ENUMS.INPUT) {
      _this.inputMirror.data(msg);
    }
  }

  var msg = data;
  if (msg instanceof Array) {
    msg.forEach(function(subMessage) {
      handleMessage(JSON.parse(subMessage));
    });
  } else {
    handleMessage(msg);
  }
};

function MouseMirror(doc, options) {
  this.CURSOR_RADIUS = 10;
  this.moveEvent = options.mousemove;
  this.clickEvent = options.click;
  this.doc = doc;
  var _this = this;
  this.isRep = Boolean(options.rep);

    // keep track of the last element that was clicked on
  this.lastElementClicked;

  this.cursor = this.doc.createElement('div'); 
  this.cursor.style.backgroundImage = "url('http://gohapuna.com/wp/wp-content/uploads/2013/08/cursor.png')";
  this.cursor.style.height = '30px';
  this.cursor.style.width = '20px';
  this.cursor.style.zIndex = 10000;
  this.cursor.style.position = 'absolute';
  this.cursor.style.top = '0px';
  this.cursor.style.left = '0px';
  this.cursor.setAttribute("ignore", "true");

    // maximum number of times per second mouse movement data will be sent
    var MAX_SEND_RATE = 40;
    // has enough time elapsed to send data again?
    var isMouseTimeUp = true;
    function moveMouse(event){
      if(isMouseTimeUp){
          _this.moveEvent(event);
          isMouseTimeUp = false;
          setTimeout(function(){isMouseTimeUp = true;}, 1000 / MAX_SEND_RATE);
      }
    }


  this.doc.addEventListener('mousemove', moveMouse, false);
  this.doc.addEventListener('click', this.clickEvent, false);


  this.isDrawn = false;

  return this;
}

MouseMirror.prototype.data = function(_data) {

  if (!this.isDrawn) {
    //  Hack that appends cursor only  
    //  once a document.body exists
    if (this.doc.body) {
      this.doc.body.appendChild(this.cursor);
      this.isDrawn = true;
    }
  }

  if (_data.request === MAQAW_MIRROR_ENUMS.MOUSE_MOVE) {
    this.moveMouse(_data);
  } else if (_data.request === MAQAW_MIRROR_ENUMS.MOUSE_CLICK) {
    this.clickMouse(_data);
  }

};

MouseMirror.prototype.moveMouse = function(_data) {
  this.cursor.style.top = _data.coords.y + 'px';
  this.cursor.style.left = _data.coords.x + 'px';
};

MouseMirror.prototype.clickMouse = function(_data) {
    var x = _data.coords.x;
    var y = _data.coords.y;
    var _this = this;

    // get the clicked element
    var target = maqawGetNodeFromHierarchy(this.doc, _data.target);
    // remove highlight from last clicked element
    if(this.lastElementClicked){
        if(this.isRep){
            this.lastElementClicked.className = this.lastElementClicked.className.replace(/\bmaqaw-mirror-clicked-element-rep\b/,'');
        }
        else {
            this.lastElementClicked.className = this.lastElementClicked.className.replace(/\bmaqaw-mirror-clicked-element\b/,'');
        }
    }
    // highlight the element that was clicked if it wasn't the body
    if(target.tagName !== 'BODY'){
        if(this.isRep){
            target.className = target.className + ' maqaw-mirror-clicked-element-rep';
        } else {
            target.className = target.className + ' maqaw-mirror-clicked-element';
        }
        this.lastElementClicked = target;
    }


    function makeExpandingRing(){
        var radius = 1;
        var click = _this.doc.createElement('div');
        click.style.width = 2*radius + 'px';
        click.style.height = 2*radius + 'px';
        click.style.backgroundColor = 'transparent';
        click.style.border = '2px solid rgba(255, 255, 0, 1)';
        click.style.borderRadius = '999px';
        click.style.zIndex = 10000;
        click.style.position = 'absolute';
        click.style.top = y - radius + 'px';
        click.style.left = x - radius + 'px';
        click.setAttribute("ignore", "true");
        _this.doc.body.appendChild(click);

        var rate = 50;
        var radiusIncrease = 2;
        var transparency = 1;
        var transparencyRate = .03;

        (function expand() {
            radius += radiusIncrease;
            transparency -= transparencyRate;
            click.style.border = '2px solid rgba(255, 255, 0, ' + transparency + ')';
            click.style.width = 2*radius + 'px';
            click.style.height = 2*radius + 'px';
            click.style.top = y - radius + 'px';
            click.style.left = x - radius + 'px';

            if(transparency > 0){
                setTimeout(expand, rate);
            } else {
                _this.doc.body.removeChild(click);
            }
        })();
    }

    var numRings = 6;
    var ringSpacing = 300;
    var ringCounter = 0;

    function doRings (){
        if(ringCounter < numRings){
            makeExpandingRing();
            ringCounter++;
            setTimeout(doRings, ringSpacing);
        }
    }
};

MouseMirror.prototype.off = function() {
  this.doc.removeEventListener('mousemove', this.moveEvent, false);
  this.doc.removeEventListener('click', this.clickEvent, false);
};


/*
 * Attach listeners to input elements so that they can be mirrored.
 * doc - The document to search for input elements
 * conn - The connection to use to send mirror updates about the inputs
 */
function MaqawInputMirror(doc, options){
    this.doc = doc;
    var _this = this;

    this.radioAndCheckbox = options.radioAndCheckbox;
    this.singleSelect = options.singleSelect;
    this.multipleSelect = options.multipleSelect;
    this.inputDefault = options.inputDefault;

    function keyUpEvent(event){
        var target = event.target;
        if(target.tagName === 'INPUT'){
            (_this.inputDefault.bind(target))();
        }

        else if(target.tagName === 'TEXTAREA'){
            (_this.inputDefault.bind(target))();
        }
    }

    function changeEvent(event){
        var target = event.target;
        if(target.tagName === 'INPUT'){
            if(target.type === 'radio' || target.type === 'checkbox'){
                (_this.radioAndCheckbox.bind(target))();
            } else {
                (_this.inputDefault.bind(target))();
            }
        }

        else if(target.tagName === 'SELECT'){
            if(target.type === 'select-one'){
                (_this.singleSelect.bind(target))();
            } else if(target.type === 'select-multiple'){
                (_this.multipleSelect.bind(target))();
            }
        }
    }

    this.doc.addEventListener('keyup', keyUpEvent, false);
    this.doc.addEventListener('change', changeEvent, false);
}

MaqawInputMirror.prototype.data = function(data){
    // get the DOM node that was changed
    var inputNode = maqawGetNodeFromHierarchy(this.doc, data.index);

    // set the checked attribute if applicable
    if(typeof data.checked !== 'undefined'){
        inputNode.checked = data.checked;
    }

    // check for select options
    else if (typeof data.selectedIndex !== 'undefined'){
        inputNode.selectedIndex = data.selectedIndex;
    }

    // check for multiple select options
    else if (typeof data.selectedOptions !== 'undefined'){
        var i, option, length = inputNode.options.length, selectedOptions = data.selectedOptions,
            optionsList = inputNode.options;
        for (i = 0; i < length; i++ ) {
            option = optionsList[i];
            var index = selectedOptions.indexOf(option.text);
            if(index !== -1){
                option.selected = true;
            } else {
                option.selected = false;
            }

        }
    }

    // otherwise set text value
    else {
        inputNode.value = data.text;
    }
};

MaqawInputMirror.prototype.off = function() {
    this.doc.removeEventListener('keyup', this.inputDefault, false);
    this.doc.removeEventListener('change', this.radioAndCheckbox, false);
    this.doc.removeEventListener('change', this.singleSelect, false);
    this.doc.removeEventListener('change', this.multipleSelect, false);
};
// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function TreeMirror(root, delegate) {
  this.root = root;
  this.idMap = {};
  this.delegate = delegate;
}

TreeMirror.prototype = {
  initialize: function(rootId, children) {
    this.idMap[rootId] = this.root;

    for (var i = 0; i < children.length; i++)
      this.deserializeNode(children[i], this.root);
  },

  deserializeNode: function(nodeData, parent) {
    if (nodeData === null)
      return null;

    if (typeof nodeData == 'number')
      return this.idMap[nodeData];

    var doc = this.root; //instanceof HTMLDocument ? this.root : this.root.ownerDocument;

    var node;
    switch(nodeData.nodeType) {
      case Node.COMMENT_NODE:
        node = doc.createComment(nodeData.textContent);
        break;

      case Node.TEXT_NODE:
        node = doc.createTextNode(nodeData.textContent);
        break;

      case Node.DOCUMENT_TYPE_NODE:
        node = doc.implementation.createDocumentType(nodeData.name, nodeData.publicId, nodeData.systemId);
        break;

      case Node.ELEMENT_NODE:
        //  Check if node has ignore attribute  if so, do not render. //
        if (nodeData.attributes && nodeData.attributes["ignore"])
          return;

        if (this.delegate && this.delegate.createElement)
          node = this.delegate.createElement(nodeData.tagName);
        if (!node)
          node = doc.createElement(nodeData.tagName);

        Object.keys(nodeData.attributes).forEach(function(name) {
          if (!this.delegate ||
              !this.delegate.setAttribute ||
              !this.delegate.setAttribute(node, name, nodeData.attributes[name])) {
            node.setAttribute(name, nodeData.attributes[name]);
          }
        }, this);

        break;
    }

    this.idMap[nodeData.id] = node;

    if (parent)
      parent.appendChild(node);

    if (nodeData.childNodes) {
      for (var i = 0; i < nodeData.childNodes.length; i++)
        this.deserializeNode(nodeData.childNodes[i], node);
    }

    return node;
  },

  applyChanged: function(removed, addedOrMoved, attributes, text) {
    function removeNode(node) {
      if (node.parentNode)
        node.parentNode.removeChild(node);
    }

    function moveOrInsertNode(data) {
      var parent = data.parentNode;
      var previous = data.previousSibling;
      var node = data.node;

      parent.insertBefore(node, previous ? previous.nextSibling : parent.firstChild);
    }

    function updateAttributes(data) {
      var node = this.deserializeNode(data.node);
      Object.keys(data.attributes).forEach(function(attrName) {
        var newVal = data.attributes[attrName];
        if (newVal === null) {
          node.removeAttribute(attrName);
        } else {
          if (!this.delegate ||
              !this.delegate.setAttribute ||
              !this.delegate.setAttribute(node, attrName, newVal)) {
            node.setAttribute(attrName, newVal);
          }
        }
      }, this);
    }

    function updateText(data) {
      var node = this.deserializeNode(data.node);
      node.textContent = data.textContent;
    }

    addedOrMoved.forEach(function(data) {
      data.node = this.deserializeNode(data.node);
      data.previousSibling = this.deserializeNode(data.previousSibling);
      data.parentNode = this.deserializeNode(data.parentNode);

      // NOTE: Applying the changes can result in an attempting to add a child
      // to a parent which is presently an ancestor of the parent. This can occur
      // based on random ordering of moves. The way we handle this is to first
      // remove all changed nodes from their parents, then apply.
      removeNode(data.node);
    }, this);

    removed.map(this.deserializeNode, this).forEach(removeNode);
    addedOrMoved.forEach(moveOrInsertNode);
    attributes.forEach(updateAttributes, this);
    text.forEach(updateText, this);

    removed.forEach(function(id) {
      delete this.idMap[id]
    }, this);
  }
}

function TreeMirrorClient(target, mirror, testingQueries) {
  this.target = target;
  this.mirror = mirror;
  this.knownNodes = new MutationSummary.NodeMap;

  var rootId = this.serializeNode(target).id;
  var children = [];
  for (var child = target.firstChild; child; child = child.nextSibling)
    children.push(this.serializeNode(child, true));

  this.mirror.initialize(rootId, children);

  var self = this;

  var queries = [{ all: true }];

  if (testingQueries)
    queries = queries.concat(testingQueries);

  this.mutationSummary = new MutationSummary({
    rootNode: target,
    callback: function(summaries) {
      self.applyChanged(summaries);
    },
    queries: queries
  });
}

TreeMirrorClient.prototype = {
  nextId: 1,

  disconnect: function() {
    if (this.mutationSummary) {
      this.mutationSummary.disconnect();
      this.mutationSummary = undefined;
    }
  },

  rememberNode: function(node) {
    var id = this.nextId++;
    this.knownNodes.set(node, id);
    return id;
  },

  forgetNode: function(node) {
    delete this.knownNodes.delete(node);
  },

  serializeNode: function(node, recursive) {
    if (node === null)
      return null;

    var id = this.knownNodes.get(node);
    if (id !== undefined) {
      return id;
    }

    var data = {
      nodeType: node.nodeType,
      id: this.rememberNode(node)
    };

    switch(data.nodeType) {
      case Node.DOCUMENT_TYPE_NODE:
        data.name = node.name;
        data.publicId = node.publicId;
        data.systemId = node.systemId;
        break;

      case Node.COMMENT_NODE:
      case Node.TEXT_NODE:
        data.textContent = node.textContent;
        break;

      case Node.ELEMENT_NODE:
        data.tagName = node.tagName;
        data.attributes = {};
        for (var i = 0; i < node.attributes.length; i++) {
          var attr = node.attributes.item(i);
          data.attributes[attr.name] = attr.value;
        }

        if (recursive && node.childNodes.length) {
          data.childNodes = [];

          for (var child = node.firstChild; child; child = child.nextSibling)
            data.childNodes.push(this.serializeNode(child, true));
        }
        break;
    }

    return data;
  },

  serializeAddedAndMoved: function(changed) {
    var all = changed.added.concat(changed.reparented).concat(changed.reordered);

    var parentMap = new MutationSummary.NodeMap;
    all.forEach(function(node) {
      var parent = node.parentNode;
      var children = parentMap.get(parent)
      if (!children) {
        children = new MutationSummary.NodeMap;
        parentMap.set(parent, children);
      }

      children.set(node, true);
    });

    var moved = [];

    parentMap.keys().forEach(function(parent) {
      var children = parentMap.get(parent);

      var keys = children.keys();
      while (keys.length) {
        var node = keys[0];
        while (node.previousSibling && children.has(node.previousSibling))
          node = node.previousSibling;

        while (node && children.has(node)) {
          moved.push({
            node: this.serializeNode(node),
            previousSibling: this.serializeNode(node.previousSibling),
            parentNode: this.serializeNode(node.parentNode)
          });

          children.delete(node);
          node = node.nextSibling;
        }

        var keys = children.keys();
      }
    }, this);

    return moved;
  },

  serializeAttributeChanges: function(attributeChanged) {
    var map = new MutationSummary.NodeMap;

    Object.keys(attributeChanged).forEach(function(attrName) {
      attributeChanged[attrName].forEach(function(element) {
        var record = map.get(element);
        if (!record) {
          record = {
            node: this.serializeNode(element),
            attributes: {}
          };
          map.set(element, record);
        }

        record.attributes[attrName] = element.getAttribute(attrName);
      }, this);
    }, this);

    return map.keys().map(function(element) {
      return map.get(element);
    });
  },

  serializeCharacterDataChange: function(node) {
    return {
      node: this.serializeNode(node),
      textContent: node.textContent
    }
  },

  applyChanged: function(summaries) {
    var changed = summaries[0]
    var removed = changed.removed.map(this.serializeNode, this);
    var moved = this.serializeAddedAndMoved(changed);
    var attributes = this.serializeAttributeChanges(changed.attributeChanged);
    var text = changed.characterDataChanged.map(this.serializeCharacterDataChange, this);

    this.mirror.applyChanged(removed, moved, attributes, text);

    changed.removed.forEach(this.forgetNode, this);
  }
}
// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function(global) {
  "use strict";

  var matchesSelector = 'matchesSelector';
  if ('webkitMatchesSelector' in Element.prototype)
    matchesSelector = 'webkitMatchesSelector';
  else if ('mozMatchesSelector' in Element.prototype)
    matchesSelector = 'mozMatchesSelector';

  var MutationObserver = global.MutationObserver || global.WebKitMutationObserver || global.MozMutationObserver;
  if (MutationObserver === undefined) {
    console.log('MutationSummary cannot load: DOM Mutation Observers are required.');
    console.log('https://developer.mozilla.org/en-US/docs/DOM/MutationObserver');
    return;
  }

  // NodeMap UtilityClass. Exposed as MutationSummary.NodeMap.
  // TODO(rafaelw): Consider using Harmony Map when available.

  var ID_PROP = '__mutation_summary_node_map_id__';
  var nextId_ = 1;

  function ensureId(node) {
    if (!node[ID_PROP]) {
      node[ID_PROP] = nextId_++;
      return true;
    }

    return false;
  }

  function NodeMap() {
    this.map_ = {};
  };

  NodeMap.prototype = {
    set: function(node, value) {
      ensureId(node);
      this.map_[node[ID_PROP]] = {k: node, v: value};
    },
    get: function(node) {
      if (ensureId(node))
        return;
      var byId = this.map_[node[ID_PROP]];
      if (byId)
        return byId.v;
    },
    has: function(node) {
      return !ensureId(node) && node[ID_PROP] in this.map_;
    },
    'delete': function(node) {
      if (ensureId(node))
        return;
      delete this.map_[node[ID_PROP]];
    },
    keys: function() {
      var nodes = [];
      for (var id in this.map_) {
        nodes.push(this.map_[id].k);
      }
      return nodes;
    }
  };

  function hasOwnProperty(obj, propName) {
    return Object.prototype.hasOwnProperty.call(obj, propName);
  }

  // Reachability & Matchability changeType constants.
  var STAYED_OUT = 0;
  var ENTERED = 1;
  var STAYED_IN = 2;
  var EXITED = 3;

  // Sub-states of STAYED_IN
  var REPARENTED = 4;
  var REORDERED = 5;

  /**
   * This is no longer in use, but conceptually it still represents the policy for
   * reporting node movement:
   *
   *  var reachableMatchableProduct = [
   *  //  STAYED_OUT,  ENTERED,     STAYED_IN,   EXITED
   *    [ STAYED_OUT,  STAYED_OUT,  STAYED_OUT,  STAYED_OUT ], // STAYED_OUT
   *    [ STAYED_OUT,  ENTERED,     ENTERED,     STAYED_OUT ], // ENTERED
   *    [ STAYED_OUT,  ENTERED,     STAYED_IN,   EXITED     ], // STAYED_IN
   *    [ STAYED_OUT,  STAYED_OUT,  EXITED,      EXITED     ]  // EXITED
   *  ];
   */

  function enteredOrExited(changeType) {
    return changeType == ENTERED || changeType == EXITED;
  }

  var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

  function MutationProjection(rootNode, elementFilter, calcReordered, calcOldPreviousSibling) {
    this.rootNode = rootNode;
    this.elementFilter = elementFilter;
    this.calcReordered = calcReordered;
    this.calcOldPreviousSibling = calcOldPreviousSibling;
  }

  MutationProjection.prototype = {

    getChange: function(node) {
      var change = this.changeMap.get(node);
      if (!change) {
        change = {
          target: node
        };
        this.changeMap.set(node, change);
      }

      if (node.nodeType == Node.ELEMENT_NODE)
        change.matchCaseInsensitive = node instanceof HTMLElement && node.ownerDocument instanceof HTMLDocument;

      return change;
    },

    getParentChange: function(node) {
      var change = this.getChange(node);
      if (!change.childList) {
        change.childList = true;
        change.oldParentNode = null;
      }

      return change;
    },

    handleChildList: function(mutation) {
      this.childListChanges = true;

      forEach(mutation.removedNodes, function(el) {
        var change = this.getParentChange(el);

        // Note: is it possible to receive a removal followed by a removal. This
        // can occur if the removed node is added to an non-observed node, that
        // node is added to the observed area, and then the node removed from
        // it.
        if (change.added || change.oldParentNode)
          change.added = false;
        else
          change.oldParentNode = mutation.target;
      }, this);

      forEach(mutation.addedNodes, function(el) {
        var change = this.getParentChange(el);
        change.added = true;
      }, this);
    },

    handleAttributes: function(mutation) {
      this.attributesChanges = true;

      var change = this.getChange(mutation.target);
      if (!change.attributes) {
        change.attributes = true;
        change.attributeOldValues = {};
      }

      var oldValues = change.attributeOldValues;
      if (!hasOwnProperty(oldValues, mutation.attributeName)) {
        oldValues[mutation.attributeName] = mutation.oldValue;
      }
    },

    handleCharacterData: function(mutation) {
      this.characterDataChanges = true;

      var change = this.getChange(mutation.target);
      if (change.characterData)
        return;
      change.characterData = true;
      change.characterDataOldValue = mutation.oldValue;
    },

    processMutations: function(mutations) {
      this.mutations = mutations;
      this.changeMap = new NodeMap;

      this.mutations.forEach(function(mutation) {
        switch (mutation.type) {
          case 'childList':
            this.handleChildList(mutation);
            break;
          case 'attributes':
            this.handleAttributes(mutation);
            break;
          case 'characterData':
            this.handleCharacterData(mutation);
            break;
        }
      }, this);

      // Calculate node movement.
      var entered = this.entered = [];
      var exited = this.exited = [];
      var stayedIn = this.stayedIn = new NodeMap;

      if (!this.childListChanges && !this.attributesChanges)
        return; // No childList or attributes mutations occurred.

      var matchabilityChange = this.matchabilityChange.bind(this);

      var reachabilityChange = this.reachabilityChange.bind(this);
      var wasReordered = this.wasReordered.bind(this);

      var visited = new NodeMap;
      var self = this;

      function ensureHasOldPreviousSiblingIfNeeded(node) {
        if (!self.calcOldPreviousSibling)
          return;

        self.processChildlistChanges();

        var parentNode = node.parentNode;
        var change = self.changeMap.get(node);
        if (change && change.oldParentNode)
          parentNode = change.oldParentNode;

        change = self.childlistChanges.get(parentNode);
        if (!change) {
          change = {
            oldPrevious: new NodeMap
          };

          self.childlistChanges.set(parentNode, change);
        }

        if (!change.oldPrevious.has(node)) {
          change.oldPrevious.set(node, node.previousSibling);
        }
      }

      function visitNode(node, parentReachable) {
        if (visited.has(node))
          return;
        visited.set(node, true);

        var change = self.changeMap.get(node);
        var reachable = parentReachable;

        // node inherits its parent's reachability change unless
        // its parentNode was mutated.
        if ((change && change.childList) || reachable == undefined)
          reachable = reachabilityChange(node);

        if (reachable == STAYED_OUT)
          return;

        // Cache match results for sub-patterns.
        matchabilityChange(node);

        if (reachable == ENTERED) {
          entered.push(node);
        } else if (reachable == EXITED) {
          exited.push(node);
          ensureHasOldPreviousSiblingIfNeeded(node);

        } else if (reachable == STAYED_IN) {
          var movement = STAYED_IN;

          if (change && change.childList) {
            if (change.oldParentNode !== node.parentNode) {
              movement = REPARENTED;
              ensureHasOldPreviousSiblingIfNeeded(node);
            } else if (self.calcReordered && wasReordered(node)) {
              movement = REORDERED;
            }
          }

          stayedIn.set(node, movement);
        }

        if (reachable == STAYED_IN)
          return;

        // reachable == ENTERED || reachable == EXITED.
        for (var child = node.firstChild; child; child = child.nextSibling) {
          visitNode(child, reachable);
        }
      }

      this.changeMap.keys().forEach(function(node) {
        visitNode(node);
      });
    },

    getChanged: function(summary) {
      var matchabilityChange = this.matchabilityChange.bind(this);

      this.entered.forEach(function(node) {
        var matchable = matchabilityChange(node);
        if (matchable == ENTERED || matchable == STAYED_IN)
          summary.added.push(node);
      });

      this.stayedIn.keys().forEach(function(node) {
        var matchable = matchabilityChange(node);

        if (matchable == ENTERED) {
          summary.added.push(node);
        } else if (matchable == EXITED) {
          summary.removed.push(node);
        } else if (matchable == STAYED_IN && (summary.reparented || summary.reordered)) {
          var movement = this.stayedIn.get(node);
          if (summary.reparented && movement == REPARENTED)
            summary.reparented.push(node);
          else if (summary.reordered && movement == REORDERED)
            summary.reordered.push(node);
        }
      }, this);

      this.exited.forEach(function(node) {
        var matchable = matchabilityChange(node);
        if (matchable == EXITED || matchable == STAYED_IN)
          summary.removed.push(node);
      })
    },

    getOldParentNode: function(node) {
      var change = this.changeMap.get(node);
      if (change && change.childList)
        return change.oldParentNode ? change.oldParentNode : null;

      var reachabilityChange = this.reachabilityChange(node);
      if (reachabilityChange == STAYED_OUT || reachabilityChange == ENTERED)
        throw Error('getOldParentNode requested on invalid node.');

      return node.parentNode;
    },

    getOldPreviousSibling: function(node) {
      var parentNode = node.parentNode;
      var change = this.changeMap.get(node);
      if (change && change.oldParentNode)
        parentNode = change.oldParentNode;

      change = this.childlistChanges.get(parentNode);
      if (!change)
        throw Error('getOldPreviousSibling requested on invalid node.');

      return change.oldPrevious.get(node);
    },

    getOldAttribute: function(element, attrName) {
      var change = this.changeMap.get(element);
      if (!change || !change.attributes)
        throw Error('getOldAttribute requested on invalid node.');

      if (change.matchCaseInsensitive)
        attrName = attrName.toLowerCase();

      if (!hasOwnProperty(change.attributeOldValues, attrName))
        throw Error('getOldAttribute requested for unchanged attribute name.');

      return change.attributeOldValues[attrName];
    },

    getAttributesChanged: function(postFilter) {
      if (!this.attributesChanges)
        return {}; // No attributes mutations occurred.

      var attributeFilter;
      var caseInsensitiveFilter;
      if (postFilter) {
        attributeFilter = {};
        caseInsensitiveFilter = {};
        postFilter.forEach(function(attrName) {
          attributeFilter[attrName] = true;
          var lowerAttrName = attrName.toLowerCase();
          if (attrName != lowerAttrName) {
            caseInsensitiveFilter[lowerAttrName] = attrName;
          }
        });
      }

      var result = {};

      var nodes = this.changeMap.keys();
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        var change = this.changeMap.get(node);
        if (!change.attributes)
          continue;

        if (STAYED_IN != this.reachabilityChange(node) || STAYED_IN != this.matchabilityChange(node))
          continue;

        var element = node;
        var oldValues = change.attributeOldValues;

        Object.keys(oldValues).forEach(function(name) {
          var localName = name;
          if (change.matchCaseInsensitive && caseInsensitiveFilter && caseInsensitiveFilter[name])
            localName = caseInsensitiveFilter[name];

          if (attributeFilter && !attributeFilter[localName])
            return;

          if (element.getAttribute(name) == oldValues[name])
            return;

          if (!result[localName])
            result[localName] = [];

          result[localName].push(element);
        });
      }

      return result;
    },

    getOldCharacterData: function(node) {
      var change = this.changeMap.get(node);
      if (!change || !change.characterData)
        throw Error('getOldCharacterData requested on invalid node.');

      return change.characterDataOldValue;
    },

    getCharacterDataChanged: function() {
      if (!this.characterDataChanges)
        return []; // No characterData mutations occurred.

      var nodes = this.changeMap.keys();
      var result = [];
      for (var i = 0; i < nodes.length; i++) {
        var target = nodes[i];
        if (STAYED_IN != this.reachabilityChange(target) || STAYED_IN != this.matchabilityChange(target))
          continue;

        var change = this.changeMap.get(target);
        if (!change.characterData ||
            target.textContent == change.characterDataOldValue)
          continue

        result.push(target);
      }

      return result;
    },

    /**
     * Returns whether a given node:
     *
     *    STAYED_OUT, ENTERED, STAYED_IN or EXITED
     *
     * the set of nodes reachable from the root.
     *
     * These four states are the permutations of whether the node
     *
     *   wasReachable(node)
     *   isReachable(node)
     *
     */
    reachabilityChange: function(node) {
      this.reachableCache = this.reachableCache || new NodeMap;
      this.wasReachableCache = this.wasReachableCache || new NodeMap;

      // Close over owned values.
      var rootNode = this.rootNode;
      var changeMap = this.changeMap;
      var reachableCache = this.reachableCache;
      var wasReachableCache = this.wasReachableCache;

      // An node's oldParent is
      //   -its present parent, if nothing happened to it
      //   -null if the first thing that happened to it was an add.
      //   -the node it was removed from if the first thing that happened to it
      //      was a remove.
      function getOldParent(node) {
        var change = changeMap.get(node);

        if (change && change.childList) {
          if (change.oldParentNode)
            return change.oldParentNode;
          if (change.added)
            return null;
        }

        return node.parentNode;
      }

      // Is the given node reachable from the rootNode.
      function getIsReachable(node) {
        if (node === rootNode)
          return true;
        if (!node)
          return false;

        var isReachable = reachableCache.get(node);
        if (isReachable === undefined) {
          isReachable = getIsReachable(node.parentNode);
          reachableCache.set(node, isReachable);
        }
        return isReachable;
      }

      // Was the given node reachable from the rootNode.
      // A node wasReachable if its oldParent wasReachable.
      function getWasReachable(node) {
        if (node === rootNode)
          return true;
        if (!node)
          return false;

        var wasReachable = wasReachableCache.get(node);
        if (wasReachable === undefined) {
          wasReachable = getWasReachable(getOldParent(node));
          wasReachableCache.set(node, wasReachable);
        }
        return wasReachable;
      }

      if (getIsReachable(node))
        return getWasReachable(node) ? STAYED_IN : ENTERED;
      else
        return getWasReachable(node) ? EXITED : STAYED_OUT;
    },

    checkWasMatching: function(el, filter, isMatching) {
      var change = this.changeMap.get(el);
      if (!change || !change.attributeOldValues)
        return isMatching;

      var tagName = filter.tagName;
      if (change.matchCaseInsensitive &&
          tagName != '*' &&
          hasOwnProperty(filter, 'caseInsensitiveTagName')) {
        tagName = filter.caseInsensitiveTagName;
      }

      if (tagName != '*' && tagName != el.tagName)
        return false;

      var attributeOldValues = change.attributeOldValues;
      var significantAttrChanged = filter.qualifiers.some(function(qualifier) {
        if (qualifier.class)
          return hasOwnProperty(attributeOldValues, 'class');
        else if (qualifier.id)
          return hasOwnProperty(attributeOldValues, 'id');
        else {
          return change.matchCaseInsensitive && hasOwnProperty(qualifier, 'caseInsensitiveAttrName') ?
              hasOwnProperty(attributeOldValues, qualifier.caseInsensitiveAttrName) :
              hasOwnProperty(attributeOldValues, qualifier.attrName)
        }
      });

      if (!significantAttrChanged)
        return isMatching;

      for (var i = 0; i < filter.qualifiers.length; i++) {
        var qualifier = filter.qualifiers[i];
        var attrName;
        if (qualifier.class)
          attrName = 'class';
        else if (qualifier.id)
          attrName = 'id';
        else {
          if (change.matchCaseInsensitive &&
              hasOwnProperty(qualifier, 'caseInsensitiveAttrName')) {
            attrName = qualifier.caseInsensitiveAttrName;
          } else {
            attrName = qualifier.attrName;
          }
        }

        var contains = qualifier.class ? true : qualifier.contains;

        var attrOldValue = hasOwnProperty(attributeOldValues, attrName) ?
            attributeOldValues[attrName] : el.getAttribute(attrName);

        if (attrOldValue == null)
          return false;

        if (qualifier.hasOwnProperty('attrValue')) {
          if (!contains && qualifier.attrValue !== attrOldValue)
            return false;

          var subvalueMatch = attrOldValue.split(' ').some(function(subValue) {
            return subValue == qualifier.attrValue;
          });

          if (!subvalueMatch)
            return false;
        }
      }

      return true;
    },

    /**
     * Returns whether a given element:
     *
     *   STAYED_OUT, ENTERED, EXITED or STAYED_IN
     *
     * the set of element which match at least one match pattern.
     *
     * These four states are the permutations of whether the element
     *
     *   wasMatching(node)
     *   isMatching(node)
     *
     */
    matchabilityChange: function(node) {
      // TODO(rafaelw): Include PI, CDATA?
      // Only include text nodes.
      if (this.filterCharacterData) {
        switch (node.nodeType) {
          case Node.COMMENT_NODE:
          case Node.TEXT_NODE:
            return STAYED_IN;
          default:
            return STAYED_OUT;
        }
      }

      // No element filter. Include all nodes.
      if (!this.elementFilter)
        return STAYED_IN;

      // Element filter. Exclude non-elements.
      if (node.nodeType !== Node.ELEMENT_NODE)
        return STAYED_OUT;

      var el = node;

      function computeMatchabilityChange(filter) {
        if (!this.matchCache)
          this.matchCache = {};
        if (!this.matchCache[filter.selectorString])
          this.matchCache[filter.selectorString] = new NodeMap;

        var cache = this.matchCache[filter.selectorString];
        var result = cache.get(el);
        if (result !== undefined)
          return result;

        var isMatching = el[matchesSelector](filter.selectorString);
        var wasMatching = this.checkWasMatching(el, filter, isMatching);

        if (isMatching)
          result = wasMatching ? STAYED_IN : ENTERED;
        else
          result = wasMatching ? EXITED : STAYED_OUT;

        cache.set(el, result);
        return result;
      }

      var matchChanges = this.elementFilter.map(computeMatchabilityChange, this);
      var accum = STAYED_OUT;
      var i = 0;

      while (accum != STAYED_IN && i < matchChanges.length) {
        switch(matchChanges[i]) {
          case STAYED_IN:
            accum = STAYED_IN;
            break;
          case ENTERED:
            if (accum == EXITED)
              accum = STAYED_IN;
            else
              accum = ENTERED;
            break;
          case EXITED:
            if (accum == ENTERED)
              accum = STAYED_IN;
            else
              accum = EXITED;
            break;
        }

        i++;
      }

      return accum;
    },

    processChildlistChanges: function() {
      if (this.childlistChanges)
        return;

      var childlistChanges = this.childlistChanges = new NodeMap;

      function getChildlistChange(el) {
        var change = childlistChanges.get(el);
        if (!change) {
          change = {
            added: new NodeMap,
            removed: new NodeMap,
            maybeMoved: new NodeMap,
            oldPrevious: new NodeMap
          };
          childlistChanges.set(el, change);
        }

        return change;
      }

      var reachabilityChange = this.reachabilityChange.bind(this);
      var self = this;

      this.mutations.forEach(function(mutation) {
        if (mutation.type != 'childList')
          return;

        if (reachabilityChange(mutation.target) != STAYED_IN && !self.calcOldPreviousSibling)
          return;

        var change = getChildlistChange(mutation.target);

        var oldPrevious = mutation.previousSibling;

        function recordOldPrevious(node, previous) {
          if (!node ||
              change.oldPrevious.has(node) ||
              change.added.has(node) ||
              change.maybeMoved.has(node))
            return;

          if (previous &&
              (change.added.has(previous) ||
               change.maybeMoved.has(previous)))
            return;

          change.oldPrevious.set(node, previous);
        }

        forEach(mutation.removedNodes, function(node) {
          recordOldPrevious(node, oldPrevious);

          if (change.added.has(node)) {
            change.added.delete(node);
          } else {
            change.removed.set(node, true);
            change.maybeMoved.delete(node, true);
          }

          oldPrevious = node;
        });

        recordOldPrevious(mutation.nextSibling, oldPrevious);

        forEach(mutation.addedNodes, function(node) {
          if (change.removed.has(node)) {
            change.removed.delete(node);
            change.maybeMoved.set(node, true);
          } else {
            change.added.set(node, true);
          }
        });
      });
    },

    wasReordered: function(node) {
      if (!this.childListChanges)
        return false;

      this.processChildlistChanges();

      var parentNode = node.parentNode;
      var change = this.changeMap.get(node);
      if (change && change.oldParentNode)
        parentNode = change.oldParentNode;

      change = this.childlistChanges.get(parentNode);
      if (!change)
        return false;

      if (change.moved)
        return change.moved.get(node);

      var moved = change.moved = new NodeMap;
      var pendingMoveDecision = new NodeMap;

      function isMoved(node) {
        if (!node)
          return false;
        if (!change.maybeMoved.has(node))
          return false;

        var didMove = moved.get(node);
        if (didMove !== undefined)
          return didMove;

        if (pendingMoveDecision.has(node)) {
          didMove = true;
        } else {
          pendingMoveDecision.set(node, true);
          didMove = getPrevious(node) !== getOldPrevious(node);
        }

        if (pendingMoveDecision.has(node)) {
          pendingMoveDecision.delete(node);
          moved.set(node, didMove);
        } else {
          didMove = moved.get(node);
        }

        return didMove;
      }

      var oldPreviousCache = new NodeMap;
      function getOldPrevious(node) {
        var oldPrevious = oldPreviousCache.get(node);
        if (oldPrevious !== undefined)
          return oldPrevious;

        oldPrevious = change.oldPrevious.get(node);
        while (oldPrevious &&
               (change.removed.has(oldPrevious) || isMoved(oldPrevious))) {
          oldPrevious = getOldPrevious(oldPrevious);
        }

        if (oldPrevious === undefined)
          oldPrevious = node.previousSibling;
        oldPreviousCache.set(node, oldPrevious);

        return oldPrevious;
      }

      var previousCache = new NodeMap;
      function getPrevious(node) {
        if (previousCache.has(node))
          return previousCache.get(node);

        var previous = node.previousSibling;
        while (previous && (change.added.has(previous) || isMoved(previous)))
          previous = previous.previousSibling;

        previousCache.set(node, previous);
        return previous;
      }

      change.maybeMoved.keys().forEach(isMoved);
      return change.moved.get(node);
    }
  }

  // TODO(rafaelw): Allow ':' and '.' as valid name characters.
  var validNameInitialChar = /[a-zA-Z_]+/;
  var validNameNonInitialChar = /[a-zA-Z0-9_\-]+/;

  // TODO(rafaelw): Consider allowing backslash in the attrValue.
  // TODO(rafaelw): There's got a to be way to represent this state machine
  // more compactly???
  function parseElementFilter(elementFilter) {
    var selectorGroup = [];
    var currentSelector;
    var currentQualifier;

    function newSelector() {
      if (currentSelector) {
        if (currentQualifier) {
          currentSelector.qualifiers.push(currentQualifier);
          currentQualifier = undefined;
        }

        selectorGroup.push(currentSelector);
      }
      currentSelector = {
        qualifiers: []
      }
    }

    function newQualifier() {
      if (currentQualifier)
        currentSelector.qualifiers.push(currentQualifier);

      currentQualifier = {};
    }


    var WHITESPACE = /\s/;
    var valueQuoteChar;
    var SYNTAX_ERROR = 'Invalid or unsupported selector syntax.';

    var SELECTOR = 1;
    var TAG_NAME = 2;
    var QUALIFIER = 3;
    var QUALIFIER_NAME_FIRST_CHAR = 4;
    var QUALIFIER_NAME = 5;
    var ATTR_NAME_FIRST_CHAR = 6;
    var ATTR_NAME = 7;
    var EQUIV_OR_ATTR_QUAL_END = 8;
    var EQUAL = 9;
    var ATTR_QUAL_END = 10;
    var VALUE_FIRST_CHAR = 11;
    var VALUE = 12;
    var QUOTED_VALUE = 13;
    var SELECTOR_SEPARATOR = 14;

    var state = SELECTOR;
    var i = 0;
    while (i < elementFilter.length) {
      var c = elementFilter[i++];

      switch (state) {
        case SELECTOR:
          if (c.match(validNameInitialChar)) {
            newSelector();
            currentSelector.tagName = c;
            state = TAG_NAME;
            break;
          }

          if (c == '*') {
            newSelector();
            currentSelector.tagName = '*';
            state = QUALIFIER;
            break;
          }

          if (c == '.') {
            newSelector();
            newQualifier();
            currentSelector.tagName = '*';
            currentQualifier.class = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '#') {
            newSelector();
            newQualifier();
            currentSelector.tagName = '*';
            currentQualifier.id = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '[') {
            newSelector();
            newQualifier();
            currentSelector.tagName = '*';
            currentQualifier.attrName = '';
            state = ATTR_NAME_FIRST_CHAR;
            break;
          }

          if (c.match(WHITESPACE))
            break;

          throw Error(SYNTAX_ERROR);

        case TAG_NAME:
          if (c.match(validNameNonInitialChar)) {
            currentSelector.tagName += c;
            break;
          }

          if (c == '.') {
            newQualifier();
            currentQualifier.class = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '#') {
            newQualifier();
            currentQualifier.id = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '[') {
            newQualifier();
            currentQualifier.attrName = '';
            state = ATTR_NAME_FIRST_CHAR;
            break;
          }

          if (c.match(WHITESPACE)) {
            state = SELECTOR_SEPARATOR;
            break;
          }

          if (c == ',') {
            state = SELECTOR;
            break;
          }

          throw Error(SYNTAX_ERROR);

        case QUALIFIER:
          if (c == '.') {
            newQualifier();
            currentQualifier.class = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '#') {
            newQualifier();
            currentQualifier.id = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '[') {
            newQualifier();
            currentQualifier.attrName = '';
            state = ATTR_NAME_FIRST_CHAR;
            break;
          }

          if (c.match(WHITESPACE)) {
            state = SELECTOR_SEPARATOR;
            break;
          }

          if (c == ',') {
            state = SELECTOR;
            break;
          }

          throw Error(SYNTAX_ERROR);

        case QUALIFIER_NAME_FIRST_CHAR:
          if (c.match(validNameInitialChar)) {
            currentQualifier.attrValue = c;
            state = QUALIFIER_NAME;
            break;
          }

          throw Error(SYNTAX_ERROR);

        case QUALIFIER_NAME:
          if (c.match(validNameNonInitialChar)) {
            currentQualifier.attrValue += c;
            break;
          }

          if (c == '.') {
            newQualifier();
            currentQualifier.class = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '#') {
            newQualifier();
            currentQualifier.id = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '[') {
            newQualifier();
            state = ATTR_NAME_FIRST_CHAR;
            break;
          }

          if (c.match(WHITESPACE)) {
            state = SELECTOR_SEPARATOR;
            break;
          }
          if (c == ',') {
            state = SELECTOR;
            break
          }

          throw Error(SYNTAX_ERROR);

        case ATTR_NAME_FIRST_CHAR:
          if (c.match(validNameInitialChar)) {
            currentQualifier.attrName = c;
            state = ATTR_NAME;
            break;
          }

          if (c.match(WHITESPACE))
            break;

          throw Error(SYNTAX_ERROR);

        case ATTR_NAME:
          if (c.match(validNameNonInitialChar)) {
            currentQualifier.attrName += c;
            break;
          }

          if (c.match(WHITESPACE)) {
            state = EQUIV_OR_ATTR_QUAL_END;
            break;
          }

          if (c == '~') {
            currentQualifier.contains = true;
            state = EQUAL;
            break;
          }

          if (c == '=') {
            currentQualifier.attrValue = '';
            state = VALUE_FIRST_CHAR;
            break;
          }

          if (c == ']') {
            state = QUALIFIER;
            break;
          }

          throw Error(SYNTAX_ERROR);

        case EQUIV_OR_ATTR_QUAL_END:
          if (c == '~') {
            currentQualifier.contains = true;
            state = EQUAL;
            break;
          }

          if (c == '=') {
            currentQualifier.attrValue = '';
            state = VALUE_FIRST_CHAR;
            break;
          }

          if (c == ']') {
            state = QUALIFIER;
            break;
          }

          if (c.match(WHITESPACE))
            break;

          throw Error(SYNTAX_ERROR);

        case EQUAL:
          if (c == '=') {
            currentQualifier.attrValue = '';
            state = VALUE_FIRST_CHAR
            break;
          }

          throw Error(SYNTAX_ERROR);

        case ATTR_QUAL_END:
          if (c == ']') {
            state = QUALIFIER;
            break;
          }

          if (c.match(WHITESPACE))
            break;

          throw Error(SYNTAX_ERROR);

        case VALUE_FIRST_CHAR:
          if (c.match(WHITESPACE))
            break;

          if (c == '"' || c == "'") {
            valueQuoteChar = c;
            state = QUOTED_VALUE;
            break;
          }

          currentQualifier.attrValue += c;
          state = VALUE;
          break;

        case VALUE:
          if (c.match(WHITESPACE)) {
            state = ATTR_QUAL_END;
            break;
          }
          if (c == ']') {
            state = QUALIFIER;
            break;
          }
          if (c == "'" || c == '"')
            throw Error(SYNTAX_ERROR);

          currentQualifier.attrValue += c;
          break;

        case QUOTED_VALUE:
          if (c == valueQuoteChar) {
            state = ATTR_QUAL_END;
            break;
          }

          currentQualifier.attrValue += c;
          break;

        case SELECTOR_SEPARATOR:
          if (c.match(WHITESPACE))
            break;

          if (c == ',') {
            state = SELECTOR;
            break
          }

          throw Error(SYNTAX_ERROR);
      }
    }

    switch (state) {
      case SELECTOR:
      case TAG_NAME:
      case QUALIFIER:
      case QUALIFIER_NAME:
      case SELECTOR_SEPARATOR:
        // Valid end states.
        newSelector();
        break;
      default:
        throw Error(SYNTAX_ERROR);
    }

    if (!selectorGroup.length)
      throw Error(SYNTAX_ERROR);

    function escapeQuotes(value) {
      return '"' + value.replace(/"/, '\\\"') + '"';
    }

    selectorGroup.forEach(function(selector) {
      var caseInsensitiveTagName = selector.tagName.toUpperCase();
      if (selector.tagName != caseInsensitiveTagName)
        selector.caseInsensitiveTagName = caseInsensitiveTagName;

      var selectorString = selector.tagName;

      selector.qualifiers.forEach(function(qualifier) {
        if (qualifier.class)
          selectorString += '.' + qualifier.attrValue;
        else if (qualifier.id)
          selectorString += '#' + qualifier.attrValue;
        else {
          var caseInsensitiveAttrName = qualifier.attrName.toLowerCase();
          if (qualifier.attrName != caseInsensitiveAttrName)
            qualifier.caseInsensitiveAttrName = caseInsensitiveAttrName;

          if (qualifier.contains)
            selectorString += '[' + qualifier.attrName + '~=' + escapeQuotes(qualifier.attrValue) + ']';
          else {
            selectorString += '[' + qualifier.attrName;
            if (qualifier.hasOwnProperty('attrValue'))
              selectorString += '=' + escapeQuotes(qualifier.attrValue);
            selectorString += ']';
          }
        }
      });

      selector.selectorString = selectorString;
    });

    return selectorGroup;
  }

  var attributeFilterPattern = /^([a-zA-Z:_]+[a-zA-Z0-9_\-:\.]*)$/;

  function validateAttribute(attribute) {
    if (typeof attribute != 'string')
      throw Error('Invalid request opion. attribute must be a non-zero length string.');

    attribute = attribute.trim();

    if (!attribute)
      throw Error('Invalid request opion. attribute must be a non-zero length string.');


    if (!attribute.match(attributeFilterPattern))
      throw Error('Invalid request option. invalid attribute name: ' + attribute);

    return attribute;
  }

  function validateElementAttributes(attribs) {
    if (!attribs.trim().length)
      throw Error('Invalid request option: elementAttributes must contain at least one attribute.');

    var lowerAttributes = {};
    var attributes = {};

    var tokens = attribs.split(/\s+/);
    for (var i = 0; i < tokens.length; i++) {
      var attribute = tokens[i];
      if (!attribute)
        continue;

      var attribute = validateAttribute(attribute);
      if (lowerAttributes.hasOwnProperty(attribute.toLowerCase()))
        throw Error('Invalid request option: observing multiple case varitations of the same attribute is not supported.');
      attributes[attribute] = true;
      lowerAttributes[attribute.toLowerCase()] = true;
    }

    return Object.keys(attributes);
  }

  function validateOptions(options) {
    var validOptions = {
      'callback': true, // required
      'queries': true,  // required
      'rootNode': true,
      'oldPreviousSibling': true,
      'observeOwnChanges': true
    };

    var opts = {};

    for (var opt in options) {
      if (!(opt in validOptions))
        throw Error('Invalid option: ' + opt);
    }

    if (typeof options.callback !== 'function')
      throw Error('Invalid options: callback is required and must be a function');

    opts.callback = options.callback;
    opts.rootNode = options.rootNode || document;
    opts.observeOwnChanges = options.observeOwnChanges;
    opts.oldPreviousSibling = options.oldPreviousSibling;

    if (!options.queries || !options.queries.length)
      throw Error('Invalid options: queries must contain at least one query request object.');

    opts.queries = [];

    for (var i = 0; i < options.queries.length; i++) {
      var request = options.queries[i];

      // all
      if (request.all) {
        if (Object.keys(request).length > 1)
          throw Error('Invalid request option. all has no options.');

        opts.queries.push({all: true});
        continue;
      }

      // attribute
      if (request.hasOwnProperty('attribute')) {
        var query = {
          attribute: validateAttribute(request.attribute)
        };

        query.elementFilter = parseElementFilter('*[' + query.attribute + ']');

        if (Object.keys(request).length > 1)
          throw Error('Invalid request option. attribute has no options.');

        opts.queries.push(query);
        continue;
      }

      // element
      if (request.hasOwnProperty('element')) {
        var requestOptionCount = Object.keys(request).length;
        var query = {
          element: request.element,
          elementFilter: parseElementFilter(request.element)
        };

        if (request.hasOwnProperty('elementAttributes')) {
          query.elementAttributes = validateElementAttributes(request.elementAttributes);
          requestOptionCount--;
        }

        if (requestOptionCount > 1)
          throw Error('Invalid request option. element only allows elementAttributes option.');

        opts.queries.push(query);
        continue;
      }

      // characterData
      if (request.characterData) {
        if (Object.keys(request).length > 1)
          throw Error('Invalid request option. characterData has no options.');

        opts.queries.push({ characterData: true });
        continue;
      }

      throw Error('Invalid request option. Unknown query request.');
    }

    return opts;
  }

  function elementFilterAttributes(filters) {
    var attributes = {};

    filters.forEach(function(filter) {
      filter.qualifiers.forEach(function(qualifier) {
        if (qualifier.class)
          attributes['class'] = true;
        else if (qualifier.id)
          attributes['id'] = true;
        else
          attributes[qualifier.attrName] = true;
      });
    });

    return Object.keys(attributes);
  }

  function createObserverOptions(queries) {
    var observerOptions = {
      childList: true,
      subtree: true
    };

    var attributeFilter;
    function observeAttributes(attributes) {
      if (observerOptions.attributes && !attributeFilter)
        return; // already observing all.

      observerOptions.attributes = true;
      observerOptions.attributeOldValue = true;

      if (!attributes) {
        // observe all.
        attributeFilter = undefined;
        return;
      }

      // add to observed.
      attributeFilter = attributeFilter || {};
      attributes.forEach(function(attribute) {
        attributeFilter[attribute] = true;
        attributeFilter[attribute.toLowerCase()] = true;
      });
    }

    queries.forEach(function(request) {
      if (request.characterData) {
        observerOptions.characterData = true;
        observerOptions.characterDataOldValue = true;
        return;
      }

      if (request.all) {
        observeAttributes();
        observerOptions.characterData = true;
        observerOptions.characterDataOldValue = true;
        return;
      }

      if (request.attribute) {
        observeAttributes([request.attribute.trim()]);
        return;
      }

      if (request.elementFilter && request.elementFilter.some(function(f) { return f.className; } ))
         observeAttributes(['class']);

      var attributes = elementFilterAttributes(request.elementFilter).concat(request.elementAttributes || []);
      if (attributes.length)
        observeAttributes(attributes);
    });

    if (attributeFilter)
      observerOptions.attributeFilter = Object.keys(attributeFilter);

    return observerOptions;
  }

  function createSummary(projection, root, query) {
    projection.elementFilter = query.elementFilter;
    projection.filterCharacterData = query.characterData;

    var summary = {
      target: root,
      type: 'summary',
      added: [],
      removed: []
    };

    summary.getOldParentNode = projection.getOldParentNode.bind(projection);

    if (query.all || query.element)
      summary.reparented = [];

    if (query.all)
      summary.reordered = [];

    projection.getChanged(summary);

    if (query.all || query.attribute || query.elementAttributes) {
      var filter = query.attribute ? [ query.attribute ] : query.elementAttributes;
      var attributeChanged = projection.getAttributesChanged(filter);

      if (query.attribute) {
        summary.valueChanged = [];
        if (attributeChanged[query.attribute])
          summary.valueChanged = attributeChanged[query.attribute];

        summary.getOldAttribute = function(node) {
          return projection.getOldAttribute(node, query.attribute);
        }
      } else {
        summary.attributeChanged = attributeChanged;
        if (query.elementAttributes) {
          query.elementAttributes.forEach(function(attrName) {
            if (!summary.attributeChanged.hasOwnProperty(attrName))
              summary.attributeChanged[attrName] = [];
          });
        }
        summary.getOldAttribute = projection.getOldAttribute.bind(projection);
      }
    }

    if (query.all || query.characterData) {
      var characterDataChanged = projection.getCharacterDataChanged()
      summary.getOldCharacterData = projection.getOldCharacterData.bind(projection);

      if (query.characterData)
        summary.valueChanged = characterDataChanged;
      else
        summary.characterDataChanged = characterDataChanged;
    }

    if (summary.reordered)
      summary.getOldPreviousSibling = projection.getOldPreviousSibling.bind(projection);

    return summary;
  }

  function MutationSummary(opts) {
    var connected = false;
    var options = validateOptions(opts);
    var observerOptions = createObserverOptions(options.queries);

    var root = options.rootNode;
    var callback = options.callback;

    var elementFilter = Array.prototype.concat.apply([], options.queries.map(function(query) {
      return query.elementFilter ? query.elementFilter : [];
    }));
    if (!elementFilter.length)
      elementFilter = undefined;

    var calcReordered = options.queries.some(function(query) {
      return query.all;
    });

    var queryValidators = []
    if (MutationSummary.createQueryValidator) {
      queryValidators = options.queries.map(function(query) {
        return MutationSummary.createQueryValidator(root, query);
      });
    }

    function checkpointQueryValidators() {
      queryValidators.forEach(function(validator) {
        if (validator)
          validator.recordPreviousState();
      });
    }

    function runQueryValidators(summaries) {
      queryValidators.forEach(function(validator, index) {
        if (validator)
          validator.validate(summaries[index]);
      });
    }

    function createSummaries(mutations) {
      if (!mutations || !mutations.length)
        return [];

      var projection = new MutationProjection(root, elementFilter, calcReordered, options.oldPreviousSibling);
      projection.processMutations(mutations);

      return options.queries.map(function(query) {
        return createSummary(projection, root, query);
      });
    }

    function changesToReport(summaries) {
      return summaries.some(function(summary) {
        var summaryProps =  ['added', 'removed', 'reordered', 'reparented',
                             'valueChanged', 'characterDataChanged'];
        if (summaryProps.some(function(prop) { return summary[prop] && summary[prop].length; }))
          return true;

        if (summary.attributeChanged) {
          var attrsChanged = Object.keys(summary.attributeChanged).some(function(attrName) {
            return summary.attributeChanged[attrName].length
          });
          if (attrsChanged)
            return true;
        }
        return false;
      });
    }

    var observer = new MutationObserver(function(mutations) {
      if (!options.observeOwnChanges)
        observer.disconnect();

      var summaries = createSummaries(mutations);
      runQueryValidators(summaries);

      if (options.observeOwnChanges)
        checkpointQueryValidators();

      if (changesToReport(summaries))
        callback(summaries);

      // disconnect() may have been called during the callback.
      if (!options.observeOwnChanges && connected) {
        checkpointQueryValidators();
        observer.observe(root, observerOptions);
      }
    });

    this.reconnect = function() {
      if (connected)
        throw Error('Already connected');

      observer.observe(root, observerOptions);
      connected = true;
      checkpointQueryValidators();
    };

    var takeSummaries = this.takeSummaries = function() {
      if (!connected)
        throw Error('Not connected');

      var mutations = observer.takeRecords();
      var summaries = createSummaries(mutations);
      if (changesToReport(summaries))
        return summaries;
    };

    this.disconnect = function() {
      var summaries = takeSummaries();

      observer.disconnect();
      connected = false;

      return summaries;
    };

    this.reconnect();
  }

  // Externs
  global.MutationSummary = MutationSummary;
  global.MutationSummary.NodeMap = NodeMap; // exposed for use in TreeMirror.
  global.MutationSummary.parseElementFilter = parseElementFilter; // exposed for testing.
})(this);
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
    // scroll chat window to the latest text
    visitor.chatSession.scrollToBottom();
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
 * Date: 7/24/13
 */

/*
 * This is a wrapper class for a peerjs connection. It gracefully handles making the connection,
 * reopening the connection when it drops, saving and loading connection state, and reliably transferring
 * data over the connection.
 *
 * peer - The Peer object representing our client
 * dstId - The peer id we want to connect with
 * dataCallback - This function is passed any data that the connection receives
 * connectionCallback - This function is called whenever the connection status changes. It is passed true
 *      if the connection is open and false otherwise
 * conn - Optional. This is a peerjs DataConnection object. If included, the MaqawConnection will use it
 *      instead of creating a new one.
 */

function MaqawConnection(peer, dstId, conn) {
    var that = this;
    this.peer = peer;
    this.dstId = dstId;

    //  Callback arrays //
    this.closeDirectives = [];
    this.openDirectives = [];
    this.dataDirectives = [];
    this.errorDirectives = [];
    this.changeDirectives = [];

    // queue of messages to send reliably
    this.reliableQueue = [];
    // message that we are currently trying to send
    this.reliableMessage = null;
    // timeout to resend message when we don't hear back
    this.reliableTimeout = null;
    // the hash of the last reliable message we processed. Keep track of this so that we don't
    // process the data more than once for a duplicate message
    this.reliableLastMessageReceived = null;
    // keep track of which messages we have acked and sent
    this.ackNo = 0;
    this.seqNo = 0;

    // whether or not this connection is open. True if open and false otherwise
    this.isConnected = false;

    // whether or not the peer we are talking to has an established connection with the PeerServer.
    // Their connection with the server will drop whenever they leave the page
    this.isPeerConnectedToServer = true;

    // the peerjs DataConnection object we are using
    this.conn;

    // if a DataConnection was provided then use it. Otherwise make a new one
    if (conn) {
        this.conn = conn;
    } else {
        this.conn = this.peer.connect(this.dstId, {reliable: true});
    }

    // check the current status of the connection. It may already be open if one was passed in
    setConnectionStatus(this.conn.open);

    setConnectionCallbacks();

    /*
     * Handle data that was received by this connection. Extract any meta data we need
     * and pass the rest of it on to the data callback
     */
    function handleData(data) {
        // if this is a reliable message, handle the acknowledgement
        if (data.isReliable) {
            // check if this message is an ack and handle it if it is
            var hash = data.hash;
            // if there is no data, then the message is an ack
            if (!data.data) {
                // if this hash matches the message we sent, we can stop
                // sending it and start sending the next one
                if(that.reliableMessage && that.reliableMessage.hash === hash){
                    // cancel timeout to resend this message
                    if(that.reliableTimeout){
                        clearTimeout(that.reliableTimeout);
                        that.reliableTimeout = null;
                    }
                    that.reliableMessage = null;
                    // send the next message in the queue
                    that.sendReliable();
                }
                // no data to process so we just return
                return;
            }

            else {
                sendAck(hash);
                // remove the reliable wrapper and process the data normally
                // if this message isn't a duplicate
                if(that.reliableLastMessageReceived !== hash){
                    data = data.data;
                    that.reliableLastMessageReceived = hash;
                }

            }
        }

        else {
            // non reliable data is stringified before being sent
            // this was done to fix the slowness of packing mirror data
            data = JSON.parse(data);
        }

        // pass the data to any onData callbacks that are binded
        var i, dataLen = that.dataDirectives.length;
        for (i = 0; i < dataLen; i++) {
            that.dataDirectives[i](data);
        }
    }

    /*
     * Send our peer an acknowledgement of the reliable messages that we have received.
     * Our ackNo is the next seqNo that we are expecting from our peer
     */
    function sendAck(hash) {
        that.conn.send({
            isReliable: true,
            hash: hash
        });
    }

    /*
     * Update the status of the connection, and pass the status on to
     * the connectionListener
     */
    function setConnectionStatus(connectionStatus) {
        var i, len = that.changeDirectives.length;

        // alert all of the binded callbacks
        for (i = 0; i < len; i++) {
            that.changeDirectives[i](connectionStatus);
        }

        // save the status
        that.isConnected = connectionStatus;
    }

    /*
     * Whether or not our peer is connected to the PeerServer. They will be briefly disconnected every time
     * they change pages or reload. This is a faster way of knowing that our connection is broken than
     * waiting for the DataConnection to alert us (which takes a few seconds). Once our peer reconnects to the
     * server we need to reopen our DataConnection with them.
     * connectionStatus - true if the peer is connected and false otherwise
     */
    this.setServerConnectionStatus = function (connectionStatus) {
        // if our peer is not connected to the server, disconnect our DataChannel with them
        if (!connectionStatus) {
            setConnectionStatus(false);
        }
        // if the peer was previously disconnected but is now connected, try to reopen a DataChannel
        // with them
        if (!that.isPeerConnectedToServer && connectionStatus) {
            attemptConnection();
        }

        // save connection status
        that.isPeerConnectedToServer = connectionStatus;
    };

    /*
     * Tries to open a DataChannel with our  peer. Will retry at a set interval for a set number
     * of attempts before giving up.
     */
    function attemptConnection() {
        // how many milliseconds we will wait until trying to connect again

        /* TODO: Exponential backoff instead? */

        var retryInterval = 8000;

        //  The max number of times a connection will be attempted
        var retryLimit = 5;
        var numAttempts = 0;

        /** TODO: We should look into running web workers **/

            // create a function that will attempt to open a connection, and will retry
            // every retryInterval milliseconds until a connection is established
            // this function is immediately invoked
        (function tryOpeningConnection() {
            // start the connection opening process
            if (!that.isConnected && numAttempts < retryLimit) {
                numAttempts++;

                // close old connection
                if (that.conn) {
                    that.conn.close();
                }

                // open a new connection
                that.conn = that.peer.connect(that.dstId);

                // attach event listeners to our new connection
                setConnectionCallbacks();

                // schedule it to try again in a bit. This will only run
                // if our latest connection doesn't open
                setTimeout(tryOpeningConnection, retryInterval);
            }
        })();
    }

    /*
     * Handle a new peerjs connection request from our peer
     */
    this.newConnectionRequest = function (conn) {
        console.log("erasing old connection");
        // close the old connection
        if (that.conn) {
            that.conn.close();
        }

        // set up the new connection with callbacks
        that.conn = conn;
        setConnectionCallbacks();
    };

    /*
     * Unreliable send function. No guarantee that the peer
     * receives this data
     */
    this.send = function (data) {
        that.conn.send(JSON.stringify(data));
    };

    /*
     * Reliably sends data to the peer. A queue of items to send is made, and each item is resent
     * until an ack is received. When this is called the next item in the queue is sent. If a data
     * argument is included it is added to the queue.
     * data - Optional message to add to the sending queue
     */
    this.sendReliable = function (data) {
        // add data to queue
        if (data) {
            that.reliableQueue.push(data);
        }

        // send the first message, if a message isn't already being sent
        // and if the queue isn't empty
        if (!that.reliableMessage && that.reliableQueue.length > 0) {
            var msg = that.reliableQueue.shift();
            that.reliableMessage = {
                isReliable: true,
                hash: maqawHash(Date.now() + JSON.stringify(msg)),
                data: msg
            };

            (function send() {
                // if the connection is closed, try to open it
                if (!that.conn.open) {
                    attemptConnection();
                } else {
                    that.conn.send(that.reliableMessage);
                }
                // try again soon
                that.reliableTimeout = setTimeout(send, 1000);
            })();
        }
    };


    this.on = function (_event, directive) {
        // bind callback
        if (_event === 'data')   this.dataDirectives.push(directive);
        else if (_event === 'open')   this.openDirectives.push(directive);
        else if (_event === 'close')  this.closeDirectives.push(directive);
        else if (_event === 'error')  this.errorDirectives.push(directive);
        else if (_event === 'change') this.changeDirectives.push(directive);

        return this;
    };

    function setConnectionCallbacks() {
        that.conn.on('open', function () {
            setConnectionStatus(true);
            handleOpen();
        });

        that.conn.on('data', function (data) {
            // if we are receiving data the connection is definitely open
            setConnectionStatus(true);
            handleData(data);
        });

        that.conn.on('close', function (err) {
            setConnectionStatus(false);
            handleClose();
        });

        that.conn.on('error', function (err) {
            console.log("Connection error: " + err);
            var i, errorLen = that.errorDirectives.length;
            for (i = 0; i < errorLen; i++) {
                that.errorDirectives[i](err);
            }
            // try to reopen connection
            setConnectionStatus(false);
            attemptConnection();
        });
    }

    function handleOpen() {
        var i, len = that.openDirectives.length;
        for (i = 0; i < len; i++) {
            that.openDirectives[i]();
        }
    }

    function handleClose() {
        var i, len = that.closeDirectives.length;
        for (i = 0; i < len; i++) {
            that.closeDirectives[i]();
        }
    }
}
/*
 * The ConnectionManager keeps track of existing connections and assists in creating
 * new connections. You can explicitly create a new connection, or set a listener
 * that alerts you when another peer establishes a connection with this peer.
 * peer - Our peer object
 */

function MaqawConnectionManager(peer) {
    var that = this;
    this.peer = peer;
    this.visitors;
    this.representatives;
    this.connectionDirectives = [];


    // a list of all connections that we've created, where the key is the connecting peer id
    // and the value is the MaqawConnection object
    this.connectionList = {};

    // a list of connections that were the result of incoming requests
    this.incomingConnections = {};

    /*
     * Passed the list of visitors connected to the PeerServer. Update connections
     * based on whether or not the associated visitor is connected
     */
    this.setVisitors = function (visitors) {
        // go through our list of connections and update their connection status
        for (var id in that.connectionList) {
            var conn = that.connectionList[id];
            // indexOf returns -1 if the array does not contain the id
            var index = visitors.indexOf(id);
            if (index !== -1) {
                conn.setServerConnectionStatus(true);
            } else {
                conn.setServerConnectionStatus(false);
            }
        }
    };

    this.on = function (_event, directive) {
        if (_event === 'connection') this.connectionDirectives.push(directive);

        return this;
    };

    /*
     * Listens for incoming connection requests. If we've already setup a MaqawConnection
     * with the incoming peer, update the MaqawConnection with the new peerjs connection.
     * Otherwise create and return a new MaqawConnection with the peerjs connection.
     */
    this.peer.on('connection', function (conn) {
        // check for an existing connection with this peer
        var existingConn = that.incomingConnections[conn.peer];
        if (existingConn) {
            existingConn.newConnectionRequest(conn);
        }
        // otherwise create a new MaqawConnection
        else {
            var i, len = that.connectionDirectives.length,
                maqawConnection = new MaqawConnection(that.peer, null, conn);
            for (i = 0; i < len; i++) {
                that.connectionDirectives[i](maqawConnection);
            }
            // save the connection in our list
            that.incomingConnections[conn.peer] = maqawConnection;
        }
    });

    /*
     * Create and return a new MaqawConnection object that connects to the
     * given id. The connectionCallback is a function that will be called
     * every time the state of the connection changes. Undetermined functionality
     * when you call this with the same id multiple times. Don't do it.
     */
    this.newConnection = function (id) {
        var connection = new MaqawConnection(that.peer, id);
        that.connectionList[id] = connection;
        return connection;
    };

    /*
     * Get a connection for a specific id. If a connection exists, its MaqawConnection
     * object is return. If no connection exists for that id, undefined is returned
     */
    this.getConnection = function (id) {
        return that.connectionList[id];
    };

}
/**
 * Created By: Eli
 * Date: 7/15/13
 */

function MaqawLoginPage(manager) {
    var that = this;
    var loginEndpoint = 'http://54.214.232.157:3000/login';
    var email = 'konakid@gmail.com';
    var password = 'asdfasdf';

    this.maqawManager = manager;
    /* Create elements that make up the login page */
// create login header
    this.header = document.createElement('DIV');
    this.header.className = 'maqaw-default-client-header';
     // add text to header
    this.loginHeader = document.createElement('DIV');
    this.loginHeader.innerHTML = "Login";
    this.loginHeader.className = 'maqaw-header-text';
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
    if(maqawDebug){
        emailField.value = email;
    }
    this.body.appendChild(emailField);

    var passwordField = document.createElement("input");
    passwordField.setAttribute('type', "password");
    passwordField.setAttribute('name', "password");
    passwordField.setAttribute('id', "maqaw-login-password-field");
    passwordField.setAttribute('placeholder', 'password');
    if(maqawDebug){
        passwordField.value = password;
    }
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
        var retryRate = 2000;
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

    if (typeof XMLHttpRequest !== 'undefined') xhr = new XMLHttpRequest();
    else {
        var versions = ["MSXML2.XmlHttp.5.0",
            "MSXML2.XmlHttp.4.0",
            "MSXML2.XmlHttp.3.0",
            "MSXML2.XmlHttp.2.0",
            "Microsoft.XmlHttp"]

        for (var i = 0, len = versions.length; i < len; i++) {
            try {
                xhr = new ActiveXObject(versions[i]);
                break;
            }
            catch (e) {
            }
        } // end for
    }

    xhr.onreadystatechange = ensureReadiness;

    function ensureReadiness() {
        // post completed
        if (xhr.readyState === 4) {
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
        if (!sKey || !this.hasItem(sKey)) {
            return false;
        }
        document.cookie = encodeURI(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sPath ? "; path=" + sPath : "");
        return true;
    },

    hasItem: function (sKey) {
        return (new RegExp("(?:^|;\\s*)" + encodeURI(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
    }

};

/*
 * Returns an array containing the position of the given node in the dom
 */
function maqawGetNodeHierarchy(doc, node) {
    var index = [];
    while (node !== doc.body) {
        index.unshift(Array.prototype.indexOf.call(node.parentElement.children, node));
        node = node.parentElement;
    }
    return index;
}

/*
 * Given an array from maqawGetNodeHierarchy returns the specified node in the dom
 */
function maqawGetNodeFromHierarchy(doc, hierarchy){
    var i, length = hierarchy.length, node = doc.body;
          for(i = 0; i < length; i++){
              node = node.children[hierarchy[i]];
          }
    return node;
}

function maqawHash(str){
    var hash = 0;
    if (str.length == 0) return hash;
    for (i = 0; i < str.length; i++) {
        char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}


/*
 * Type codes for sending data with a MaqawConnection
 */
var MAQAW_DATA_TYPE = {
    TEXT: 0,
    SCREEN: 1,
    VISITOR_INFO: 2
};/*
 Creates a chat window with a unique key to talk
 to a visitor.
 */
function MaqawChatSession(chatSessionContainer, sendTextFunction, srcName, dstName) {
    var that = this;
    this.srcName = srcName;
    this.dstName = dstName;
    this.sendTextFunction = sendTextFunction;

    // parent div to display chat session
    this.mainContainer = chatSessionContainer;

    // add div to display chat text
    this.textDisplay;
    this.textDisplay = document.createElement('DIV');
    this.textDisplay.className = 'maqaw-chat-display';
    this.mainContainer.appendChild(this.textDisplay);

    // put initial text in the display window
    this.textDisplay.innerHTML = "Questions or feedback? We're online and ready to help you!";

    // add box for text entry
    this.textInput;
    this.textInput = document.createElement('textarea');
    this.textInput.className = 'maqaw-chat-entry';
    this.textInput.setAttribute('placeholder', 'Type and hit enter to chat');
    this.mainContainer.appendChild(this.textInput);

    // add listener to text input. Capture text when enter is pressed
    this.textInput.addEventListener("keyup", keyPress, false);

    this.setPeerName = function(name){
        that.dstName = name;
    };

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
            //send data to our chat buddy
            that.sendTextFunction(text);
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

    /*
     * Called when text is received from a peer
     */
    this.newTextReceived = function (text) {
        handleResponse(text);
    };

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

    /*
     * Whether or not the the chat session should allow the user to send text. If set to true
     * they can send text normally. If set to false the text input box is disabled
     * displayMessage - Optional. A message to display to the rep
     */
    this.setAllowMessageSending = function (allowMessageSending, displayMessage) {
        if (allowMessageSending) {
            allowMessages();
        } else {
            disallowMessages(displayMessage);
        }

    };

    // disallow sending messages by default until we are told otherwise
    // prevent a message from being sent
    var savedTextValue = null;
    disallowMessages();

    function disallowMessages(displayMessage) {
        that.textInput.disabled = true;
        // save any text the user is tying, if it hasn't already been saved
        if (savedTextValue === null) {
            savedTextValue = that.textInput.value;
        }

        if(displayMessage){
            that.textInput.value = displayMessage;
        }   else {
            that.textInput.value = "Connecting to peer...";
        }
    }

    // allow messages to be sent
    function allowMessages() {
        that.textInput.disabled = false;
        // restore original text
        if (savedTextValue !== null) {
            that.textInput.value = savedTextValue;
            savedTextValue = null;
        }
    }
}

// Returns the main div container for the chat session
MaqawChatSession.prototype.getContainer = function () {
    return this.mainContainer;
};



/*
 VisitorSession manages a visitor's interaction with the Maqaw client. It contains the connection
 with a representative, and handles all display and transfer of communication with that rep.
 */
var MAQAW_VISITOR_ENUMS = {
    INFO: 0,
    ACK: 1
};
function MaqawVisitorSession(manager, visitorInfo) {
    var that = this;
    this.chatSession;
    this.maqawManager = manager;

    // Visitor info was passed in if it was previously stored. Otherwise it is undefined
    this.visitorInfo = null;
    if (visitorInfo) {
        this.visitorInfo = new MaqawVisitorInfo(visitorInfo);
    }

    // the status of our connection with a peer. True for open and false for closed
    // Defaults to false until we can verify that a connection has been opened
    this.isConnected = false;

    /* initialize header container for this session */
    this.header = document.createElement('DIV');
    this.header.className = 'maqaw-default-client-header';
    // div to hold text in header
    this.headerText = document.createElement('DIV');
    this.headerText.className = 'maqaw-header-text';
    this.header.appendChild(this.headerText);
    // function to change the header text
    function changeHeaderText(text) {
        that.headerText.innerHTML = text;
    }

    // set default text
    changeHeaderText("Chat with us!");

    /* initialize body container */
    this.body = document.createElement('DIV');
    this.body.className = 'maqaw-visitor-session-body';
    // content div holds the main content in the body
    this.bodyContent = document.createElement('DIV');
    this.body.appendChild(this.bodyContent);
    // function to set what content is shown
    function setBodyContent(div) {
        if(that.bodyContent.firstChild !== div){
            that.bodyContent.innerHTML = '';
            that.bodyContent.appendChild(div);
        }
    }

    /* Create chat container and session */
    var chatSessionContainer = document.createElement("DIV");
    this.chatSession = new MaqawChatSession(chatSessionContainer, sendTextFromChat, 'You', this.maqawManager.chatName);

    /* Create container for when no rep is available */
    var noRepContainer = document.createElement("DIV");
    noRepContainer.id = 'maqaw-no-rep-window';
    noRepContainer.innerHTML = 'Sorry, there are no representatives available to chat';
    // default to showing the noRepContainer until a connection with a rep is made
    setBodyContent(noRepContainer);

    /* Create a form to get the visitor's name and email address before chatting */
    var visitorInfoContainer = document.createElement("DIV");
    visitorInfoContainer.id = 'maqaw-visitor-session-info';
    // Text instructions
    var infoInstructions = document.createElement("DIV");
    infoInstructions.id = 'maqaw-visitor-info-instructions';
    infoInstructions.innerHTML = "Enter your name and email to start chatting with us!";
    visitorInfoContainer.appendChild(infoInstructions);
    // field for visitor name
    var nameField = document.createElement("input");
    nameField.setAttribute('type', "text");
    nameField.setAttribute('id', "maqaw-visitor-name-field");
    nameField.setAttribute('placeholder', 'Name');
    visitorInfoContainer.appendChild(nameField);
    // field for visitor email
    var emailField = document.createElement("input");
    emailField.setAttribute('type', "text");
    emailField.setAttribute('id', "maqaw-visitor-email-field");
    emailField.setAttribute('placeholder', 'Email');
    visitorInfoContainer.appendChild(emailField);
    // submit button
    var infoSubmitButton = document.createElement('DIV');
    infoSubmitButton.id = 'maqaw-visitor-info-button';
    infoSubmitButton.innerHTML = 'Ok';
    visitorInfoContainer.appendChild(infoSubmitButton);
    // submit button callback
    infoSubmitButton.addEventListener('click', visitorInfoEntered, false);
    // callback function for when the visitor submits their info in the form
    function visitorInfoEntered() {
        var name = nameField.value;
        var email = emailField.value;
        // TODO: Display error message for invalid name or email
        // check to make sure name and email aren't blank
        if (name !== '' && email !== '') {
            setVisitorInfo({
                name: name,
                email: email
            });
        }
    }

    // updates this visitor's personal information, shares the info with the connected rep,
    // and allows the chat window to be shown now that we have the visitor's info
    function setVisitorInfo(info) {
        // store the visitor's info
        that.visitorInfo = new MaqawVisitorInfo(info);
        // send the info to the rep
        sendVisitorInfo();
        // call the connectionStatusCallback so that this visitor can be shown the chat window
        // now that we have their info
        connectionStatusCallback(that.isConnected);
    }

    // transmit the visitor's info to our peer
    function sendVisitorInfo() {
        // make sure we have info and a connection
        if (that.visitorInfo && that.connection) {
            // send the data to the rep
            that.connection.sendReliable({
                type: MAQAW_DATA_TYPE.VISITOR_INFO,
                request: MAQAW_VISITOR_ENUMS.INFO,
                info: JSON.stringify(that.visitorInfo)
            });
        }
    }

    /* Add footer to body */
    this.bodyFooter = document.createElement('DIV');
    this.bodyFooter.id = 'maqaw-visitor-session-footer';
    this.body.appendChild(this.bodyFooter);

    // add login button to footer
    var loginButton = document.createElement('DIV');
    loginButton.id = 'maqaw-login-button';
    loginButton.innerHTML = "Login";
    this.bodyFooter.appendChild(loginButton);

    // setup callback for when login is clicked
    loginButton.addEventListener('click', this.maqawManager.loginClicked, false);

    // add Maqaw link to footer
    var maqawLink = document.createElement('DIV');
    maqawLink.id = 'maqaw-link';
    maqawLink.innerHTML = 'POWERED BY <a href="http://maqaw.com">MAQAW</a>';
    this.bodyFooter.appendChild(maqawLink);

    /* Set up the connection */
    this.connection = null;
    this.mirror = new Mirror();

    this.maqawManager.connectionManager.on('connection', function (maqawConnection) {
        if (that.connection) {
            console.log("Warning: Overwriting existing connection");
        }
        that.connection = maqawConnection;
        that.mirror.setConnection(that.connection);

        maqawConnection.on('data', connectionDataCallback)
            .on('change', connectionStatusCallback)
            .on('open', connectionOpenCallback);
    });

    /*
     * Called whenever a new connection with our peer is established. This can happen multiple times,
     * like when the rep changes pages and a new connection has to be made.
     */
    function connectionOpenCallback() {
        // make sure the rep has this visitor's info
        connectionStatusCallback(true);
        sendVisitorInfo();
    }

    /*
     * For a connection received from the newConnectionListener, this function will be called by the connection
     * when data is received through the connection
     */
    function connectionDataCallback(data) {
        // handle text
        if (data.type === MAQAW_DATA_TYPE.TEXT) {
            that.chatSession.newTextReceived(data.text);
        }
        if (data.type === MAQAW_DATA_TYPE.SCREEN) {
            that.mirror && that.mirror.data(data);
        }
    }

    /*
     * For a connection received from the newConnectionListener, this function will be called by the connection
     * whenever the status of the connection changes. The connection status will be passed,
     * with true representing an open connection and false representing closed.
     */
    function connectionStatusCallback(connectionStatus) {
        that.isConnected = connectionStatus;

        // update chat session to reflect connection status
        that.chatSession.setAllowMessageSending(connectionStatus);

        // show a different page if there is no connection with a rep
        if (connectionStatus) {
            // if they've enter their info, show them the chat window
            if (that.visitorInfo) {
                setBodyContent(chatSessionContainer);
                that.chatSession.scrollToBottom();
            }
            // otherwise ask for their information
            else {
                setBodyContent(visitorInfoContainer);
            }
        }
        else {
            setBodyContent(noRepContainer);
        }
    }

    /*
     * This function is passed to the Chat Session. The session will call it whenever it has text
     * to send to the peer.
     */
    function sendTextFromChat(text) {
        if (!that.connection || !that.isConnected) {
            console.log("Error: Cannot send text. Bad connection");
        } else {
            that.connection.sendReliable({
                type: MAQAW_DATA_TYPE.TEXT,
                text: text
            });
        }
    }

    // returns an object containing the data that constitutes this visitors session
    this.getSessionData = function () {
        return {
            chatText: that.chatSession.getText(),
            info: JSON.stringify(that.visitorInfo)
        };
    };

    // takes an visitor session data object (from getSessionData) and loads this visitor
    // session with it
    this.loadSessionData = function (sessionData) {
        if (sessionData.chatText) {
            that.chatSession.setText(sessionData.chatText);
        }

        var info = JSON.parse(sessionData.info);
        if (info) {
            setVisitorInfo(info);
        }
    };
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

    // list of all visitors connected to the server
    this.visitors = [];

    // this id is used whenever the client makes a connection with peerjs
    this.id = maqawCookies.getItem('peerId');
    // an array of ids of representatives that are available for chat
    this.maqawDisplay = display;
    this.visitorSession;
    this.repSession;

    // a MaqawLoginPage object that can be used to login with rep details
    this.loginPage;

    if (this.id) {
        //  peer id has been stored in the browser. Use it
        this.peer = new Peer(this.id, {key: this.key, host: host, port: port});
    } else {
        //  No peer id cookie found. Retrieve new id from browser
        this.peer = new Peer({key: this.key, host: host, port: port});
    }

    // initialize the connection manager
    this.connectionManager = new MaqawConnectionManager(this.peer);

    /* listen for peer js events */
    this.peer.on('open', function (id) {
        console.log("My id: " + id);
        that.id = id
        maqawCookies.setItem('peerId', id, Infinity);
    });

    this.peer.on('clients', function (visitors) {
        console.log('visitors: ' + visitors.msg);
        that.visitors = visitors.msg;
        that.handleVisitorList(that.visitors);
    });

    this.peer.on('representatives', function (reps) {
        console.log('Reps: ' + reps.msg);
        that.representatives = reps.msg;
    });

    /*
     * Receives an array of visitors from the Peer Server and passes
     * the information along to VisitorList and ConnectionManager
     */
    this.handleVisitorList = function (visitors) {
        that.repSession && that.repSession.visitorList.setVisitorList(visitors);
        that.connectionManager.setVisitors(visitors);
    };

    this.screenShareClicked = function(event) {
      event.preventDefault();  
      event.stopPropagation();
      
    };

    // function called the VisitorSession when the login button is clicked
    this.loginClicked = function () {
        // create and display a new LoginPage object if one doesn't already exist
        if (!that.loginPage) {
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
        if (!that.loginPage) {
            that.loginPage = new MaqawLoginPage(that);
        }
        that.loginPage.loginWithParams(loginCookie);
        that.loadPreviousRepSession = true;
        return true;
    };

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

    // Add listener to save session state on exit so it can be reloaded later.
    window.addEventListener('unload', saveSession, false);
}
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

    // list of all visitors connected to the server
    this.visitors = [];

    // this id is used whenever the client makes a connection with peerjs
    this.id = maqawCookies.getItem('peerId');
    // an array of ids of representatives that are available for chat
    this.maqawDisplay = display;
    this.visitorSession;
    this.repSession;

    // a MaqawLoginPage object that can be used to login with rep details
    this.loginPage;

    if (this.id) {
        //  peer id has been stored in the browser. Use it
        this.peer = new Peer(this.id, {key: this.key, host: host, port: port});
    } else {
        //  No peer id cookie found. Retrieve new id from browser
        this.peer = new Peer({key: this.key, host: host, port: port});
    }

    // initialize the connection manager
    this.connectionManager = new MaqawConnectionManager(this.peer);

    /* listen for peer js events */
    this.peer.on('open', function (id) {
        console.log("My id: " + id);
        that.id = id
        maqawCookies.setItem('peerId', id, Infinity);
    });

    this.peer.on('clients', function (visitors) {
        console.log('visitors: ' + visitors.msg);
        that.visitors = visitors.msg;
        that.handleVisitorList(that.visitors);
    });

    this.peer.on('representatives', function (reps) {
        console.log('Reps: ' + reps.msg);
        that.representatives = reps.msg;
    });

    /*
     * Receives an array of visitors from the Peer Server and passes
     * the information along to VisitorList and ConnectionManager
     */
    this.handleVisitorList = function (visitors) {
        that.repSession && that.repSession.visitorList.setVisitorList(visitors);
        that.connectionManager.setVisitors(visitors);
    };

    this.screenShareClicked = function(event) {
      event.preventDefault();  
      event.stopPropagation();
      
    };

    // function called the VisitorSession when the login button is clicked
    this.loginClicked = function () {
        // create and display a new LoginPage object if one doesn't already exist
        if (!that.loginPage) {
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
        if (!that.loginPage) {
            that.loginPage = new MaqawLoginPage(that);
        }
        that.loginPage.loginWithParams(loginCookie);
        that.loadPreviousRepSession = true;
        return true;
    };

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

    // Add listener to save session state on exit so it can be reloaded later.
    window.addEventListener('unload', saveSession, false);
}
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

    // add the CSS file if the loadCss flag is true. This can be set to false if you
    // want to use a local css file
    if(maqawLoadCss){
        this.loadCSS();
    }

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
    header.className = 'maqaw-header-text';
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
    this.visitorList = new MaqawVisitorList(visitorListContainer, this);

    var screenShareButton = document.createElement('DIV');
    screenShareButton.id = 'maqaw-screenshare-button';
    screenShareButton.innerHTML = 'Screenshare';
    loggedInChatFooter.appendChild(screenShareButton);
    
// add logout listener
    screenShareButton.addEventListener('click', this.visitorList.requestScreenClicked, false);

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

/*
 * A Visitor object represents a visitor on the site from the representative's point of view. Each visitor
 * has a row in the visitor display table where we can click on them to select or deselect them for chat. The
 * visitor object maintains all connection data that the rep needs to communicate with the visitor on the site.
 * id - the peerjs id of this visitor
 * info -An object containing information about this visitor, like name and email address.
 *      This is optional, but can be provided if we have previously saved it for later
 * visitorList - The MaqawVisitorList object storing this visitor
 */
function MaqawVisitor(id, visitorList, info) {
    var that = this;
    this.visitorList = visitorList;
    this.connectionManager = visitorList.maqawManager.connectionManager;
    this.id = id;
    this.info = null;
    if (info) {
        this.info = new MaqawVisitorInfo(info);
    }

    /* Set up visitor display row in table */
    // create row to display this visitor in the table
    // -1 inserts the row at the end of the table
    var row = this.visitorList.table.insertRow(-1);
    row.className = 'maqaw-visitor-list-entry';
    // the cell containing the visitor info
    var cell = document.createElement("td");
    row.appendChild(cell);
    // function to update the visitor info in the row when we get personalized data
    // from the visitor
    function updateRowInfo() {
        cell.innerHTML = '';
        var text = "visitor";
        // use personal information if we have it
        if (that.info) {
            text = that.info.name + " (" + that.info.email+")";
        }
        var textNode = document.createTextNode(text);
        cell.appendChild(textNode);
    }
    // update the row data now for the case that visitor info was loaded from storage
    updateRowInfo();

    // This function is passed any data that is received from the visitor peer
    // about their personal information
    function handleVisitorInfo(data) {
        // create a new VisitorInfo object with this data
        that.info = JSON.parse(data.info);
        // update the chat session name
        that.chatSession.setPeerName(that.info.name);
        //update the display in the visitor table
        updateRowInfo();
        // call the connectionStatusCallback so that this visitor can be
        //shown in the list now that we have their info
        connectionStatusCallback(that.isConnected);
        // send an acknowledgement back
        that.connection.send({
            type: MAQAW_DATA_TYPE.VISITOR_INFO,
            request: MAQAW_VISITOR_ENUMS.ACK
        });
    }

    // append row to the visitor table
    this.visitorList.tBody.appendChild(row);

    this.isSelected = false;

    // append click listener to row
    row.addEventListener('click', clickCallBack, false);
    function clickCallBack() {
        that.visitorList.setSelectedVisitor(that);
    }

    // set the row to be hidden at first until it's visitor's chat session is established
    hide();

    /* ************************************* */

    // whether or not we have an open connection with this visitor. Default to false
    // until we can verify a connection is open
    this.isConnected = false;

    // each visitor has a unique chat session
    this.chatSession = new MaqawChatSession(document.createElement("DIV"), sendTextFromChat, 'You', "Visitor");

    // create a new connection
    this.connection = this.connectionManager.newConnection(this.id);

    this.mirror = new Mirror({'conn': this.connection});

    this.connection.on('data', connectionDataCallback)
        .on('change', connectionStatusCallback);

    // create a new screen sharing session after connection is made //

    /*
     * This function is passed to the chat session, which calls it every time it has text
     * to send across the connection
     */
    function sendTextFromChat(text) {
        if (!that.connection || !that.connection.isConnected) {
            console.log("Visitor Error: Cannot send text. Bad connection");
        } else {
            that.connection.sendReliable({
                type: MAQAW_DATA_TYPE.TEXT,
                text: text
            });
        }
    }

    /*
     * This function is passed to the MaqawConnection, which calls it whenever it receives data for us
     */
    function connectionDataCallback(data) {
        // handle text
        if (data.type === MAQAW_DATA_TYPE.TEXT) {
            that.chatSession.newTextReceived(data.text);
            // show an alert that new text has been received
            alertNewText();
        }
        if (data.type === MAQAW_DATA_TYPE.SCREEN) {
            that.mirror && that.mirror.data(data);
        }
        // information about the visitor
        if (data.type === MAQAW_DATA_TYPE.VISITOR_INFO) {
            handleVisitorInfo(data);
        }
    }

    /*
     * Display an alert to the rep that new text has been received
     */
    function alertNewText() {
        // only show an alert if the visitor is not currently selected
        var flashSpeed = 1000;
        var on = true;
        (function flashRow() {
            if (!that.isSelected) {
                if (on) {
                    row.className = 'maqaw-alert-visitor';
                } else {
                    row.className = 'maqaw-visitor-list-entry';
                }
                on = !on;
                setTimeout(flashRow, flashSpeed);
            }
        })();

    }

    /*
     * Passed to MaqawConnection and called whenever the connection's status changes
     */
    function connectionStatusCallback(connectionStatus) {
        // tell the chatsession whether or not to accept text based on the connection status
        that.chatSession.setAllowMessageSending(connectionStatus, 'Waiting for visitor...');

        // update row display to reflect connection status
        var timeoutId;
        if (!connectionStatus) {
            // if the connection was previously active, allow a few seconds for the visitor to
            // return before hiding them in the list
            var timeout = 5000;
            timeoutId = setTimeout(function () {
                // if the visitor is still not connected after the timeout period then hide them
                if (!that.isConnected) {
                    hide();
                }
                timeoutId = null;
            }, timeout);

            // TODO: Tell mirror to stop sending data

        } else {
            // cancel any timeout that was started
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            // only show this visitor if we have gotten their info
            if (that.info) {
                show();
            }
        }

        // if we were previously disconnected but are now connected then restart the mirror
        // if applicable
        if (!that.isConnected && connectionStatus) {
            that.mirror && that.mirror.connectionReset();
        }

        // save status
        that.isConnected = connectionStatus;
    }


    /*
     * Change the row that displays this visitor to reflect that it's been selected.
     * Tell the ChatManager to display this Visitor's ChatSession
     */
    this.select = function () {
        that.isSelected = true;
        // change class to selected
        row.className = 'maqaw-selected-visitor';
        // show visitor chat window
        that.visitorList.chatManager.showVisitorChat(that)
    };

    /*
     * Update the visitor display to not show this visitor as selected.
     * Tell the ChatManager to not display this visitor's ChatSession
     */
    this.deselect = function () {
        that.isSelected = false;
        // change class to default
        row.className = 'maqaw-visitor-list-entry';
        // clear chat window
        that.visitorList.chatManager.clear(that);
    };

    this.requestScreen = function () {
        // Initialize new mirror if it exists.
        // pass mirror the connection.
        // ----------------------------------
        //
        if (this.mirror) {
            // Start sharing dat screen //
            this.mirror.requestScreen();
        } else {
            // unable to share
            console.log("mirror unable to initialize");
        }
    };

    /*
     * Hide this visitor from being in the visitor table. Deselect it if applicable
     */
    function hide() {
        that.isSelected = false;
        // change class to default
        row.className = 'maqaw-visitor-list-entry';
        row.style.display = 'none';
        // tell the VisitorList that we are going to hide this visitor so that it can deselect
        // it if necessary
        that.visitorList.hideVisitor(that);
        // clear chat window
        that.visitorList.chatManager.clear(that);
    }

    /*
     * Show this visitor in the visitor table
     */
    function show() {
        row.style.display = 'block';
    }
}

/*
 * Store information about this visitor
 */
function MaqawVisitorInfo(info) {
    this.name = info.name;
    this.email = info.email;
}
/*
 VisitorList manages all current visitors and displays the list in a table
 listDisplayContainer - The div that will contain the table of visitors
 chatManager - the ChatManager object that will manage chat sessions
 */
function MaqawVisitorList(listDisplayContainer, repSession) {
    var that = this;
    // hash of all visitors on the site. Their id is the key, and their visitor object the value
    this.visitors = {};
    this.listDisplayContainer = listDisplayContainer;
    this.chatManager = repSession.chatManager;
    this.maqawManager = repSession.maqawManager;
    this.repSession = repSession;
    // a visitor object representing the visitor that is selected in the table
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
    this.requestScreenClicked = function(event) {
      event.preventDefault();
      event.stopPropagation();
      if (that.selectedVisitor) {
        that.selectedVisitor.requestScreen();
      } else {
        console.log("No visitor currently selected");
      } 
    }

    this.setVisitorList = function (visitorIds) {
            // go through each id in the list
            for (var i = 0; i < visitorIds.length; i++) {
                var id = visitorIds[i];
                // check for a visitor with this id
                var visitor = that.visitors[id];
                // if one doesn't exist, create one
                if (!visitor) {
                    that.visitors[id] = createNewVisitor(id);
                }
            }
    };

    // create a new visitor using the specified id, and wrap the visitor in a MaqawVisitorWrapper object
    // to help manage selecting and displaying the visitor
    function createNewVisitor(id) {
        var info = {
            name: 'Visitor ' + that.visitorCounter,
            email: 'no email'
        };
        that.visitorCounter++;
        // use rowIndex of -1 so the row is added at the end of the table
        return new MaqawVisitor(id, that, null);
    }

    this.setSelectedVisitor = function (visitor) {
        // deselect previously selected row, if there is one
        if (that.selectedVisitor) {
            that.selectedVisitor.deselect();

            // if the previously selected visitor was selected again, leave it deselected
            if (that.selectedVisitor === visitor) {
                that.selectedVisitor = undefined;
                return;
            }
        }

        // set new visitor to be selected
        visitor.select();

        // save visitor
        that.selectedVisitor = visitor;
    };


    // a visitor calls this to tell the MaqawVisitorList that it is going inactive
    // the visitor list needs to make sure that it doesn't have this visitor set
    // as selected
    this.hideVisitor = function (visitor) {
        if (that.selectedVisitor && that.selectedVisitor === visitor) {
            that.selectedVisitor = undefined;
        }
    };

    // return the an object representing the state of this visitorList
    this.getListData = function () {
        var data = {};
        // create an entry for each visitor
        var counter = 0;
        for (var visitorId in that.visitors) {
            var visitor = that.visitors[visitorId];
            // save the data that is important to state
            var visitorData = {
                info: visitor.info,
                id: visitor.id,
                isSelected: visitor.isSelected,
                chatText: visitor.chatSession.getText()
            };
            data[counter] = visitorData;
            counter++;
        }
        return data;
    };

    // load a state represented by an object from getListData
    this.loadListData = function (listData) {
          // start by clearing any existing visitors and the visitor table
        that.visitors = {};
        that.tBody.innerHTML = '';

        // reset the visitor counter
        that.visitorCounter = 1;

        // go through each entry in the list data and restore it
        for(var index in listData){
            var visitorData = listData[index];
            // create and update a visitor using this data
            var visitor = new MaqawVisitor(visitorData.id, that, visitorData.info);

            if(visitorData.isSelected) {
                that.selectedVisitor = visitor;
                visitor.select();
            }

            // increment the visitor counter
            that.visitorCounter++;

            // load the chat history
            visitor.chatSession.setText(visitorData['chatText']);

            // save this visitor in the list
            that.visitors[visitor.id] = visitor;
        }
    }
}
/*
 This file generates a Maqaw client that can be loaded onto a site
 */

// start by creating the display
// pass true to start the client minimized, or false to default to maximize
var maqawDisplay = new MaqawDisplay(!maqawDebug);
maqawDisplay.setup();

// Initialize the MaqawManager to deal with clients and representatives
var maqawManager = new MaqawManager(maqawOptions, maqawDisplay);

// start a visitor session
maqawManager.startVisitorSession();

// try to restore a previously logged in rep session if one exists

var maqawRepSessionStarted;
maqawRepSessionStart = maqawManager.loadRepSession();

// if no rep session could be loaded, display the visitor session
if(!maqawRepSessionStarted){
    maqawManager.showVisitorSession();
}

