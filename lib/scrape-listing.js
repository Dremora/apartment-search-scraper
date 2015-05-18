var Promise = require('bluebird');
var jsdom = require('jsdom');

var scrapeListing = function (listing) {
  listing.last_fetched = new Date();
  return new Promise(function (resolve, reject) {
    jsdom.env({
      url: 'http://www.spareroom.co.uk/flatshare/flatshare_detail.pl?flatshare_id=' + listing.id,
      scripts: ['http://code.jquery.com/jquery.js'],
      done: function (errors, window) {
        if (errors) {
          reject(errors);
        } else {
          resolve(window);
        }
      }
    });
  })
  .then(function (window) {
    var $ = window.$;

    $('script').each(function () {
      var script = $(this).text();
      if (script.match(/SR\.listing\.detail\.init/)) {
        var latMatches = /lat\:\s+\'(\-?\d+\.\d+)\'/g.exec(script);
        var lngMatches = /lon\:\s+\'(\-?\d+\.\d+)\'/g.exec(script);
        if (latMatches) {
          listing.coords = {
            lat: latMatches[1],
            lng: lngMatches[1]
          }
        }
      }
    });

    listing.title = $('#listing_heading .no_h1_underline').text().trim();

    var transportInfo = $('.key_features li:nth-child(4)');
    if (transportInfo.length) {
      var station = transportInfo[0].childNodes[0].nodeValue.trim();
      var walkingTime = transportInfo.find('small').text().trim();
      listing.station = station.replace(/\s+/g, ' ');
      listing.walking_time = /\((\d+-\d+).*\)/g.exec(walkingTime)[1];
    }

    listing.photos = [];
    var src = $('.photos dl a img').attr('src');
    if (src) {
      listing.photos.push('http:' + src);
    }
    $('#additional_photo_list li a').each(function () {
      listing.photos.push('http:' + $(this).attr('href'));
    });

    var description = [];
    $('.detaildesc').each(function () {
      description.push($(this).text().trim());
    });
    if (description.length) {
      listing.description = description.join("\n");
    }

    var section = function (label, callback) {
      $('.featurestable').each(function () {
        var $table = $(this);
        if ($table.find('caption').text().trim() === label) {
          callback.call(this);
        }
      });
    }

    var property = function (label, propName, process) {
      var $table = $(this);
      process = process ? proocess : function (id) { return id; };
      $table.find('tr').each(function () {
        var $tr = $(this);
        if ($tr.find('th').text().trim() === label) {
          listing[propName] = $tr.find('td').text().trim();
        }
      })
    }

    section('Availability', function() {
      property.call(this, 'Available', 'available_from');
      property.call(this, 'Minimum term', 'minimum_term');
      property.call(this, 'Maximum term', 'maximum_term');
    });

    section('Extra costs', function() {
      property.call(this, 'Bills included?', 'bills_included');
      property.call(this, 'Security deposit', 'deposit');
      property.call(this, 'Fees apply?', 'fees');
    });

    section('Amenities', function() {
      property.call(this, 'Furnishings', 'amenities_furnished');
      property.call(this, 'Parking', 'amenities_parking');
      property.call(this, 'Garage', 'amenities_garage');
      property.call(this, 'Garden/terrace', 'amenities_garden_or_terrace');
      property.call(this, 'Balcony/Patio', 'amenities_balcony');
      property.call(this, 'Disabled access', 'amenities_disabled_access');
      property.call(this, 'Living room', 'amenities_living_room');
      property.call(this, 'Broadband available', 'amenities_broadband');
    });

    section('Current Household', function() {
      property.call(this, '# flatmates?', 'household_number_of_flatmates');
      property.call(this, 'Total # rooms', 'household_number_of_rooms');
      property.call(this, 'Smoker?', 'household_smokers');
      property.call(this, 'Pets?', 'household_pets');
      property.call(this, 'Language', 'household_language');
      property.call(this, 'Gender', 'household_genders');
    });

    section('New tenant preferences', function() {
      property.call(this, 'Couples OK?', 'preferences_couples');
      property.call(this, 'Smoking OK?', 'preferences_smoking');
      property.call(this, 'Pets OK?', 'preferences_pets');
      property.call(this, 'Occupation', 'preferences_occupation');
      property.call(this, 'DSS', 'preferences_dss');
      property.call(this, 'References?', 'preferences_references');
      property.call(this, 'Min age', 'preferences_min_age');
      property.call(this, 'Max age', 'preferences_max_age');
      property.call(this, 'Gender', 'preferences_gender');
    });

    return listing;
  })
  .catch(function (e) {
    console.log('Error scraping ' + listing.id);
    console.log(e.stack);
    listing.error = e.stack;
    return listing;
  })
};

module.exports = scrapeListing;
