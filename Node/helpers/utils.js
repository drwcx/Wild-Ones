var md5 = require('md5');

function Utils(){

}

var zeroValue = "0".charCodeAt(0);
var aValue = "A".charCodeAt(0);

Utils.intToString = function(val){
	var bytes = new Buffer(8);
	var b;
	var res = "";
	bytes.writeDoubleBE(val);
	var i = 0;
	while(i < bytes.length){
		b = ((bytes[i] >> 4) & 15);
		res = (res + String.fromCharCode(((b > 9)) ? ((aValue + b) - 10) : (zeroValue + b)));
		b = (bytes[i] & 15);
        res = (res + String.fromCharCode(((b > 9)) ? ((aValue + b) - 10) : (zeroValue + b)));
        i++;
	}

	return res;
},

Utils.string2Bin = function(str) {
  var result = [];
  for (var i = 0; i < str.length; i++) {
    result.push(str.charCodeAt(i).toString(2));
  }
  return result;
},

Utils.bin2String = function(array) {
  var result = "";
  for (var i = 0; i < array.length; i++) {
    result += String.fromCharCode(parseInt(array[i], 2));
  }
  return result;
},


Utils.stringToInt = function(str){
	if(!str) return 0;

	if(str.length != 16){
		console.log("Bad number!");
		return -1;
	}

	var n = 0;
    var b = 0;
    var ch;
	var bytes = new Buffer(8);
	var loc = 0;

	for(var i = 0; i < str.length; i++){
		ch = str.charCodeAt(i);
		b = ch >= aValue ? (10 + ch - aValue) : (ch - zeroValue);
		i++;
		b = b << 4;
		ch = str.charCodeAt(i);
		b = b | (ch >= aValue ? 10 + ch - aValue : ch - zeroValue);
		b = b & 0xFF;
		bytes.writeUInt8(b, loc++);
	}

	n = bytes.readDoubleBE(0);
    return n;
}

Utils.randKey = function(){
	return Math.random().toString(36).substring(7);
},

Utils.randInt = function(){
	return parseInt(Math.random() * 1000);
},

Utils.md5 = function(str){
	return md5(str);
}

module.exports = Utils;
