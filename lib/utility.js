
var utility = {};

/* clone
* Clone an object and return a references-free clone
*/
utility.clone = function(object) {
  if (!object) {
    return;
  }
  var result;
  if (utility.is('Object', object)) {
    result = {};
  }else if (utility.is('Array', object)) {
    result = [];
  }else{
    return object;
  }
  
  for(var key in object) {
    if (!object.hasOwnProperty(key)) {
      continue;
    }
    var isObjectOrArray = object[key] &&
                          (utility.is('Object', object[key]) || 
                          utility.is('Array', object[key]));
    
    if (isObjectOrArray) {
        result[key] = utility.clone(object[key]);
    }else{
        result[key] = object[key];
    }
  }
  return result;
};

/* merge
* Merge object2 in object1
*/
utility.merge = function(object1, object2) {
  for (var key in object2) {
    if (!object2.hasOwnProperty(key)) {
      continue;
    }
    var isObjectOrArray = object2[key] && 
                          (utility.is('Object', object2[key]) ||
                          utility.is('Array', object2[key]));
    if (object1[key] && isObjectOrArray) {
      if (utility.is('Object', object2[key])) {
        if (!utility.is('Object', object1[key])) {
            object1[key] = {};
        }
      }
      if (utility.is('Array', object2[key])) {
        if (!utility.is('Array', object1[key])) {
            object1[key] = [];
        }
      }
      utility.merge(object1[key], object2[key]);
    }else{
      if (object2[key]!==null) { //This fixes arrays merging
          object1[key] = object2[key];
      }
    }
  }
};

/* each
* Cycle recursively over each item which is not an object or an array
  * Execute an action(object, key, path)
*/
utility.each = function(object, action, path) {
  for (var key in object) {
    var newPath = path ? path.slice() : [];
    newPath.push(key);
    if (!object.hasOwnProperty(key)) {
      continue;
    }
    var isObjectOrArray = object[key] &&
                          (utility.is('Object', object[key]) ||
                          utility.is('Array', object[key]));
    if (object[key] && isObjectOrArray) {
      utility.each(object[key], action, newPath);
    }else{
      action(object, key, newPath);
    }
  }
};

/* select
* Select a given path in an object 
* Returns the value or a slice of the object containing that path
*/
utility.select = function(object, path, returnValue) {
  var current = path.shift();
  if (!current)
    return object; 
  
  var result;
  if (utility.is('Object', object)) {
    result = {};
  }
  if (utility.is('Array', object)) {
    result = [];
  }
  if(typeof object[current] !== 'undefined' && path.length>0) {
    result[current] = utility.select(object[current], path, returnValue);
  }else{
    result[current] = object[current];
  }
  if (returnValue) {
    return result[current];
  }else{
    return result;
  }
};

/* is
 * Check an object type
 */

utility.is = function(type, object){
  return Object.prototype.toString.call(object) == '[object ' + type + ']';
}

/* isNumeric
* Returns true if it's a number
*/
utility.isNumeric = function(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

module.exports = utility;
