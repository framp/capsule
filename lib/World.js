module.exports = (function() {
  /* World
  * Data type used to store a world
  * starting/timestamp + deltas in the last lifetime ms
  */
  
  var utility = require('./utility.js');
  
  var _ = function(starting, timestamp, lifetime) {
    this.starting = this.snapshot = starting || {};
    this.timestamp = timestamp || + new Date;
    this.lifetime = lifetime || 2000;
    this.deltas = {};
  };
  
  /* put
  * Put data at edits[timestamp]
  */
  _.prototype.put = function(data, timestamp) {
    if (!this.deltas[timestamp]) {
      this.deltas[timestamp] = data;
    }else{
      utility.merge(this.deltas[timestamp], data);
    }
  };
  
  /* get
  * Merge starting with edits[0...timestamp]
  */
  _.prototype.get = function(timestamp) {
    if (!timestamp) {
      timestamp = + new Date;
    }
    
    return this.delta(0, timestamp, function(result, i, value, isStarting) {
      if (!isStarting) {
        utility.merge(result, value);
      }else{
        var starting = utility.clone(value);
        utility.merge(starting, result);
        return starting;
      }
    });
  };
  
  /* getPath
  * Get a selected value from a selected timestamp or the current snapshot
  */
  _.prototype.getPath = function(path, timestamp) {
    if (!timestamp) {
      return utility.select(this.snapshot, path);
    }else{
      return utility.select(this.get(timestamp), path);
    }
  }
  
  
  /* delta
  * Returns edits[start...stop] or execute an action on each edits
    * If skipStartingCheck is not defined delta will try to merge the deltas 
    * with starting if start is older than starting timestamp
  */
  _.prototype.delta = function(start, stop, action, skipStartingCheck) {
    if (!action) {
      action = function(result, key, value, isStarting) {
        result[key] = value;
      };
    }
    var result = {};
    var now = + new Date;
    
    //Making sure to access the object in the right order
    var keys = [];
    for(var key in this.deltas) {
      keys.push(key);
    }
    keys.sort();
    while(keys.length){
      var key = keys.shift();
      if (key>start && key<=stop) {
        action(result, key, this.deltas[key]);
      }
      if (now-key>this.lifetime) {
        utility.merge(this.starting, this.deltas[key]);
        delete this.deltas[key];
        this.timestamp = key;
      }
    }
    if (!skipStartingCheck && start<this.timestamp) {
      var starting = action(result, this.timestamp, this.starting, true);
      if (starting) {
        return starting;
      }
    }
    return result;
  };
  
  /* interpolate
  * merge starting with edits[0...timestamp] and interpolate
  */
  _.prototype.interpolate = function(timestamp) {
    //Clone starting
    var result = utility.clone(this.starting);
    var startingTimestamp = this.timestamp;
    
    //Generate an array with timestamps
    var timestamps = utility.clone(result);
    utility.each(timestamps, function(object, key) {
      object[key] = startingTimestamp;
    });
    
    var deltas = this.delta(0, + new Date, function(result, key, value) {
      if (key<=timestamp) {
        //Update the timestamps array with edits
        var localTimestamps = utility.clone(value);
        var localTimestamp = key; 
        utility.each(localTimestamps, function(object, key) {
          object[key] = timestamp;
        });
        utility.merge(timestamps, localTimestamps);
        utility.merge(result, value);
      }else{
        var deltas = utility.clone(value);
        utility.each(deltas, function(object, key, path) {
          var newValue = object[key];
          var oldValue = utility.select(result, path, true);
          var newTimestamp = key;
          var oldTimestamp = utility.select(timestamps, path, true);
                  
          var areDefined = typeof oldValue !== 'undefined' ||
                           typeof oldTimestamp !== 'undefined';
          var areNotNumeric = (!utility.isNumeric(oldValue) &&
                              !utility.is('String', oldValue)) || 
                              (!utility.isNumeric(oldValue) &&
                              !utility.is('String', oldValue));
          var areValuesEqual = newValue === oldValue;
          
          if (areDefined || areNotNumeric || areValuesEqual) {
              return;
          }
          
          var totalDelta = newValue-oldValue;
          var totalTime = newTimestamp-oldTimestamp;
          var elapsedTime = newTimestamp-timestamp;
    
          object[key] = oldValue + totalDelta*elapsedTime/totalTime;
        });
        utility.merge(result, deltas);
      }
    }, true);
    
    utility.merge(result, deltas);
    return result;
  };
  
  return _;
})();