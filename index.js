#!/usr/bin/env node

require('dotenv').load();
var scrapeSearch = require('./lib/scrape-search');
var Firebase = require('firebase');
var config = require('./lib/config');

// if (process.argv.length < 3) {
//   console.log('Please provide a search id to fetch.');
//   process.exit(1);
// }
// var id = process.argv[2];

var firebase = new Firebase(config.firebaseUrl);

scrapeSearch.london().onValue(function (listing) {
  console.log('Scraped ' + listing.id);
  firebase.child(listing.id).set(listing);
}).onEnd(function () {
  console.log('Done')
});
