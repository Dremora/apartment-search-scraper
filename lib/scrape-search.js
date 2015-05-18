"use strict";

let jsdom = require('jsdom');
let Promise = require('bluebird');
let URL = require('url-parse');
let qs = require('querystringify');
let scrapeListing = require('./scrape-listing');
let Kefir = require('kefir');

let parsePrice = function (priceString) {
  let parts = /£(\d+)\s*(.+)/.exec(priceString);
  let price = parseInt(parts[1]);
  let type = parts[2];
  if (type === 'pw') {
    price = Math.ceil(price / 7 * 31);
  }
  return price;
}

let parseId = function (link) {
  var slugged = /.*\/([0-9]+)/g.exec(link);
  if (slugged && slugged[1]) {
    return slugged[1];
  }
  let parsed = qs.parse(new URL(link).query);
  return parsed.flatshare_id || parsed.fad_id;
};

let getPage = function (url) {
  return Promise.fromNode(jsdom.env.bind(jsdom, url, ['http://code.jquery.com/jquery.js']));
};

let scrapePage = function (url, emitter) {
  console.log('Scraping ' + url);
  return getPage(url)
  .then(function (window) {
    let $ = window.$;
    return Promise.all(Array.prototype.map.call($('.listing_results > .listing_result:not(.listing_sfm)'), function (result) {
      let $result = $(result);
      let location = $result.find('.listing_location_content').text().trim();
      let type = $result.find('.description .listing_rooms').text().trim().replace(/\s+/g, ' ');
      let price = parsePrice($result.find('.listing_price').text().trim());
      let link = $result.find('a.listing_more').attr('href').trim();
      let id = parseId(link);

      let listing = {
        area: location,
        room_type: type,
        price: price,
        id: id
      };
      return scrapeListing(listing);
    }))
    .then(function (listings) {
      listings.forEach(emitter.emit.bind(emitter));
      let nextUrl = $('.navnext a').attr('href');
      if (nextUrl) {
        if (nextUrl.indexOf('/') === 0) {
          nextUrl = 'http://www.spareroom.co.uk' + nextUrl;
        }
        return scrapePage(nextUrl, emitter);
      } else {
        emitter.end();
      }
    });
  })
};

let scrapeResults = function (url) {
  return Kefir.stream(function (emitter) {
    scrapePage(url, emitter);
  });
}

module.exports.bySearchId = function (id) {
  return scrapeResults('http://www.spareroom.co.uk/flatshare/?search_id=' + id + '&mode=list&sort_by=age');
};

module.exports.london = function () {
  return scrapeResults('http://www.spareroom.co.uk/flatshare/london');
}
