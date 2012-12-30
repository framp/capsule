module.exports = (function() {
  /* Capsule
  * A framework to help you create a multiplayer game using socket.io
  * 
  * It features:
  * - A powerful hooks system to customize your game
  * - Shared code between server and client
  * - Entity interpolation
  * - Client prediction
  * - Server Validation 
  * - A bunch of other neat things
  * 
  * Sources of inspiration:
  * https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
  * http://gafferongames.com/networking-for-game-programmers/what-every-programmer-needs-to-know-about-game-networking/
  * 
  */
  
  var World = require('./World.js');
  
  var _ = function(io, options) {
    if (typeof process !== 'undefined') {
      this.server = process.title === 'node';
    }else{ 
      this.server = typeof module !== 'undefined';
    }
    this.io = io; //socket.io
    
    //Time between receiving data and using it
    this.artificialLag = options.artificialLag || 0; 
    //Time between sending updates
    this.updateInterval = options.updateInterval || 30; 
    //Time between saving user inserted data
    this.inputInterval = options.inputInterval || 30; 
    //Time before an update got merged inside the world
    this.worldLifetime = options.worldLifetime || 2000;
    //Users will get now-userDelay data when interpolating values
    this.userDelay = options.userDelay || 200; 
    //Print debug information 
    this.debug = options.debug || 0; 
    
    //Hooks are function which are executed in some key points
    this.hooks = options.hooks || {
      //Every inputInterval keys is snapshotted and saved, 
      //Every updateInterval those snapshots are executed locally and sent
      //to the server for validation
      keysSetup: function(keys) {}, //Let you edit the keys object
      //A snapshot from now-userDelay is created at each animation frame
      viewRender: function(snapshot) {}, //Let you render a snapshot
      inputsProcess: function() {}, //Let you process inputs
      userConnect: function(socket) {}, //Let you add an user 
      userDisconnect: function(socket) {} //Let you remove an user
    };

    if (this.server) {
      this.serverSetup();
    }else{
      this.clientSetup();
    }
  };

  /* clientSetup
  * Initialize reading input and storing them
  * Initialize sending input interval
  * Initialize rendering
  */
  _.prototype.clientSetup = function () {
    var that = this;
    this.world = new World({}, + new Date, this.worldLifetime);
    this.lastUpdateLag = 0;
    
    //Retrieving basic information about the client from the server
    this.io.on('user', function(user) {
      that.user = user;
    });
    
    //Start listening for updates
    this.io.on('update', function(world) {
      var update = function() {
        var updates = world[0];
        for (var timestamp in updates) {
          if (that.debug) {
            console.log('UPD', JSON.stringify(updates[timestamp]), timestamp);
          }
          that.world.put(updates[timestamp], timestamp);
        }
        that.lastUpdateLag = + new Date - world[1];
      };
      if (that.artificialLag && that.debug) {
        setTimeout(update, that.artificialLag);
      }else{
        update();
      }
    });    
    
    var inputs = {};
    var keys = {};
    
    //Setup keys you need and key listeners
    this.hooks.keysSetup.apply(this, [keys]);
    
    //Read input and store the user command
    var readingInputInterval = setInterval(function () {
      var inputUpdate = false;
      for (var code in keys) {
        if (keys[code]) {
          inputUpdate = true;
        }
      }
      if (!inputUpdate) {
        return;
      }
      
      var serverTime =  + new Date - that.lastUpdateLag;
      inputs[serverTime] = keys;
    }, this.inputInterval);

    //Send a packet of all the user commands and execute them locally
    var sendingInputInterval = setInterval(function () {
      var inputUpdate = false;
      for (var timestamp in inputs) {
        if (inputs[timestamp]) {
          inputUpdate = true;
        }
      }
      if (!inputUpdate) {
        return;
      }
      
      that.hooks.inputsProcess.apply(that, [that.user.id, inputs]);
      that.io.emit('input', inputs);
      
      inputs = {};
    }, this.updateInterval);
    
    var requestAnimationFrame = (function() {
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(callback) {
                window.setTimeout(callback, 1000 / 60);
              };
    })();
    
    //Render the view
    function renderLoop() { 
      var snapshot = that.world.interpolate(+ new Date - that.userDelay);
      that.world.snapshot = snapshot;
      //Render snapshot
      that.hooks.viewRender.apply(that, [snapshot]);
      requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);
  };
  
  /* serverSetup
  * Initialize listening for users
  * Initialize sending delta updates to users, given their last update
  */
  _.prototype.serverSetup = function () {
    var that = this;
    
    this.world = new World({}, + new Date, this.worldLifetime);
    
    this.io.sockets.on('connection', function(socket) {
      var user = that.hooks.userConnect.apply(that, [socket]);
      socket.set('user', user);
      socket.emit('user', user);
      
      socket.on('input', function (inputs) {
        var input = function() {
          socket.get('user', function(err, user) {
            if (err) {
              return;
            }
            that.hooks.inputsProcess.apply(that, [user.id, inputs]);
          });
        };
        if (that.artificialLag && that.debug) {
          setTimeout(input, that.artificialLag);
        }else{
          input();
        }
      });
      
      socket.on('disconnect', function () {
        that.hooks.userDisconnect.apply(that, [socket]);
      });
    });
    
    var sendingUpdateInterval = setInterval(function() {
      that.world.snapshot = that.world.get();
      if (that.debug && that.debug>=2) {
        var latest = JSON.stringify(that.world.snapshot, null, '\t');
        if (that.latest !== latest) {
          console.log(+ new Date);
          console.log(latest);
          that.latest = latest;
        }
      }
      that.io.sockets.clients().forEach(function(socket) {
        socket.get('timestamp', function(err, timestamp) {
          var now = + new Date;
          var update = that.world.delta(timestamp, now);
          var latest = 0;
          for (var timestamp in update) {
            if (timestamp>latest) {
              latest = timestamp;
            }
          }
          if (latest) {
            if (that.debug) {
              console.log("UPD", update, timestamp, now, 
                          JSON.stringify(that.world.snapshot), 
                          JSON.stringify(that.world.edits));
            }
            socket.emit('update', [update, now]);
            socket.set('timestamp', latest);
          }
        });
      });
    }, this.updateInterval);
  };
  
  return _;
})();