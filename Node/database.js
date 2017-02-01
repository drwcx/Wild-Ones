"use strict";

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var url = 'mongodb://localhost:27017/WO_Emu';

var database;

class Database{
    connect(){
        MongoClient.connect(url, function(err, db) {
          assert.equal(null, err);
          console.log("Connected correctly to server.");
          database = db;
        });
    }

    update(condition, data) {
       database.collection('wo_users').updateOne(
          condition,
          {
            $set: data,
            //$currentDate: { "lastModified": true }
          }, function(err, results) {
      });
    }

    count(condition, callback){
        var docs = database.collection('wo_users').find(condition);
        docs.count(function(error, n) {
            callback(n);
        });
    }

    fetch(condition, callback){
        database.collection('wo_users').findOne(condition, function(err, document){
            callback(document);
        });
    }
}


module.exports = Database;
