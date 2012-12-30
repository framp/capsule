var utility = require('../lib/utility.js');

describe('utility', function(){
  describe('merge', function(){
    it('should clone the second object in the first one, if the first one is empty', function(){
      var a = {};
      var b = {a:3, b:4};
      var bs = JSON.stringify(b);
      utility.merge(a, b);
      JSON.stringify(a).should.equal(bs);
    });
    it('should leave everything as is, if the second one is empty', function(){
      var a = {};
      var b = {a:3, b:4};
      var bs = JSON.stringify(b);
      utility.merge(b, a);
      bs.should.equal(JSON.stringify(b));
    });
    
    it('should work with complex objects (overwriting symbols with objects and objects with symbols)', function(){
      var a = {a:{e:'f'}, b:4, l:[1,2,3,4,5]};
      var b = {a:3, b:5, l:[1,32,4,{c:[0,3,{ d: { e: 5 } }]}]};
      utility.merge(a, b);
      JSON.stringify(a).should.equal('{"a":3,"b":5,"l":[1,32,4,{"c":[0,3,{"d":{"e":5}}]},5]}');
    });
    
    
    it('should ignore null but work with undefined', function(){
      var a = {a:null, b: undefined, c:43, d:54, e:{a:null, b: undefined, c:43, d:54}};
      var b = {a:3, b:6, c:undefined, d:null, e:{a:3, b:6, c:undefined, d:null}};
      utility.merge(a, b);
      JSON.stringify(a).should.equal('{"a":3,"b":6,"d":54,"e":{"a":3,"b":6,"d":54}}');
    });
    
  });
  
  describe('clone', function(){
    it('should clone the object', function(){
      var b = {a:3, b:4};
      var bs = JSON.stringify(b);
      var a = utility.clone(b);
      bs.should.equal(JSON.stringify(b));
    });
    
    it('should work with nested object', function(){
      var b = {a:3, b:4, l: [1,32,4,{c:[0,3,{ d: { e: 5 } }]}]};
      var bs = JSON.stringify(b);
      var a = utility.clone(b);
      bs.should.equal(JSON.stringify(a));
    });
    
    it('should make a real clone which doesn\'t contain reference to the past object', function(){
      var b = {a:3, b:4};
      var bs = JSON.stringify(b);
      var a = utility.clone(b);
      a.a = 5;
      bs.should.equal(JSON.stringify(b));
    });
  });
  
  describe('each', function(){
    it('should loop over each "leaf" of the object', function(){
      var b = {a:3, b:4, l: [1,32,4,{c:[0,3,{ d: { e: 5 } }]}]};
      var bs = '';
      utility.each(b, function(object, key, path){
        bs += object[key] + path.join();
      });
      bs.should.equal('3a4b1l,032l,14l,20l,3,c,03l,3,c,15l,3,c,2,d,e');
    });
  });
  
  describe('select', function(){
    describe('(returning value)', function(){
      it('should select at depth 0', function(){
        var b = {c:{d:{e:5}}};
        JSON.stringify(utility.select(b, [], true)).should.equal(JSON.stringify(b));
      });
      
      it('should select at depth 1', function(){
        var b = {c:{d:{e:5}}};
        JSON.stringify(utility.select(b, ['c'], true)).should.equal(JSON.stringify(b.c));
      });

      it('should select at depth 2', function(){
        var b = {c:{d:{e:5}}};
        JSON.stringify(utility.select(b, ['c','d'], true)).should.equal(JSON.stringify(b.c.d));
      });
    });
    describe('(returning a slice)', function(){
      it('should return a slice of an object', function(){
        var b = {c:{d:{e:5},f:4}};
        var c = {c:{f:4}};
        JSON.stringify(utility.select(b, ['c','f'])).should.equal(JSON.stringify(c));
      });
      it('should return a slice of an array', function(){
        var b = {c:{d:{e:5},f:[3,2]}};
        var c = {c:{f:[null,2]}};
        JSON.stringify(utility.select(b, ['c','f',1])).should.equal(JSON.stringify(c));
      });
      
    });
  });
});