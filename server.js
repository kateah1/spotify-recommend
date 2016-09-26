// unirest is a library to simplify making http rest requests
var unirest = require('unirest');
// express is a fast and minimalist web framework 
var express = require('express');
// eventEmmiter.on() is used to register listeners
// eventEmmiter.emit() is used to trigger events
var events = require('events');

var getFromApi = function (endpoint, args) {
  // create event emmitter to communicate if request was successful or failed
  var emitter = new events.EventEmitter();
  // make unirest http get request using endpoint
  unirest.get('https://api.spotify.com/v1/' + endpoint)
    // append querystring to URL
    .qs(args)
    // call 'end' to send request
    .end(function (response) {
      if (response.ok) {
        // trigger end event and attach the response
        emitter.emit('end', response.body);
      } else {
        // trigger error event by emmitter, attach error code return by unirest
        emitter.emit('error', response.code);
      }
    });
  return emitter;
};

var app = express();
// middle ware (software used as a bridge btwn database and app)
// used to serve static files (image, css, js) from specified directory
app.use(express.static('public'));

app.get('/search/:name', function (req, res) {
  var searchReq = getFromApi('search', {
    // arguments to add to endpoint
    q: req.params.name,
    limit: 1,
    type: 'artist'
  });

  // register listener to event emitter returned from getFromApi
  searchReq.on('end', function (item) {
    var artist = item.artists.items[0];
    unirest.get('https://api.spotify.com/v1/artists/' + artist.id + '/related-artists')
      .end(function (response) {
        console.log(response.body.artists);
        if (response.ok) {
          artist.related = response.body.artists;
          res.json(artist);
        } else {
          res.sendStatus(404);
        }
      });
    unirest.get('https://api.spotify.com/v1/artists/' + artist.related.id + '/top-tracks?country=US')
      .end(function (response) {
        if (response.ok) {
          artist.related.tracks = response.body.item.tracks;
          res.json(artist);
        } else {
          res.sendStatus(404);
        }
      });
  });

  searchReq.on('error', function (code) {
    res.sendStatus(code);
  });
});

app.listen(process.env.PORT || 8080);
