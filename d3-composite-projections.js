// http://geoexamples.com/d3-composite-projections/ Version 1.2.0. Copyright 2018 Roger Veciana i Rovira.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-geo'), require('d3-path')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-geo', 'd3-path'], factory) :
	(factory((global.d3 = {}),global.d3,global.d3));
}(this, (function (exports,d3Geo,d3Path) { 'use strict';

var epsilon = 1e-6;

function noop() {}

var x0 = Infinity;
var y0 = x0;
var x1 = -x0;
var y1 = x1;

var boundsStream = {
  point: boundsPoint,
  lineStart: noop,
  lineEnd: noop,
  polygonStart: noop,
  polygonEnd: noop,
  result: function() {
    var bounds = [[x0, y0], [x1, y1]];
    x1 = y1 = -(y0 = x0 = Infinity);
    return bounds;
  }
};

function boundsPoint(x, y) {
  if (x < x0) x0 = x;
  if (x > x1) x1 = x;
  if (y < y0) y0 = y;
  if (y > y1) y1 = y;
}

function fitExtent(projection, extent, object) {
  var w = extent[1][0] - extent[0][0],
      h = extent[1][1] - extent[0][1],
      clip = projection.clipExtent && projection.clipExtent();

  projection
      .scale(150)
      .translate([0, 0]);

  if (clip != null) projection.clipExtent(null);

  d3Geo.geoStream(object, projection.stream(boundsStream));

  var b = boundsStream.result(),
      k = Math.min(w / (b[1][0] - b[0][0]), h / (b[1][1] - b[0][1])),
      x = +extent[0][0] + (w - k * (b[1][0] + b[0][0])) / 2,
      y = +extent[0][1] + (h - k * (b[1][1] + b[0][1])) / 2;

  if (clip != null) projection.clipExtent(clip);

  return projection
      .scale(k * 150)
      .translate([x, y]);
}

function fitSize(projection, size, object) {
  return fitExtent(projection, [[0, 0], size], object);
}

// The projections must have mutually exclusive clip regions on the sphere,
// as this will avoid emitting interleaving lines and polygons.
function multiplex(streams) {
  var n = streams.length;
  return {
    point: function(x, y) { var i = -1; while (++i < n) { streams[i].point(x, y); } },
    sphere: function() { var i = -1; while (++i < n) { streams[i].sphere(); } },
    lineStart: function() { var i = -1; while (++i < n) { streams[i].lineStart(); } },
    lineEnd: function() { var i = -1; while (++i < n) { streams[i].lineEnd(); } },
    polygonStart: function() { var i = -1; while (++i < n) { streams[i].polygonStart(); } },
    polygonEnd: function() { var i = -1; while (++i < n) { streams[i].polygonEnd(); } }
  };
}

// A composite projection for France, configured by default for 960×500.
function conicConformalFrance() {
  var cache,
    cacheStream,
    europe = d3Geo.geoConicConformal().rotate([-3, -46.2]).parallels([0, 60]),
    europePoint,
    guyane = d3Geo.geoMercator().center([-53.2, 3.9]),
    guyanePoint,
    martinique = d3Geo.geoMercator().center([-61.03, 14.67]),
    martiniquePoint,
    guadeloupe = d3Geo.geoMercator().center([-61.46, 16.14]),
    guadeloupePoint,
    mayotte = d3Geo.geoMercator().center([45.16, -12.8]),
    mayottePoint,
    reunion = d3Geo.geoMercator().center([55.52, -21.13]),
    reunionPoint,
    point, pointStream = { point: function(x, y) { point = [x, y]; } };

  /*
  var europeBbox = [[-6.5, 51], [10, 41]];
  var guyaneBbox = [[-54.5, 6.29], [-50.9, 1.48]];
  */


  function conicConformalFrance(coordinates) {
    var x = coordinates[0],
      y = coordinates[1];
    return point = null, (europePoint.point(x, y), point) ||
      (guyanePoint.point(x, y), point) ||
      (martiniquePoint.point(x, y), point) ||
      (guadeloupePoint.point(x, y), point) ||
      (mayottePoint.point(x, y), point) ||
      (reunionPoint.point(x, y), point);
  }

  conicConformalFrance.invert = function(coordinates) {
    var k = europe.scale(),
      t = europe.translate(),
      x = (coordinates[0] - t[0]) / k,
      y = (coordinates[1] - t[1]) / k;

    return (y >= 0.029 && y < 0.0864 && x >= -0.14 && x < -0.0996 ? guyane :
      y >= 0 && y < 0.029 && x >= -0.14 && x < -0.0996 ? martinique :
      y >= -0.032 && y < 0 && x >= -0.14 && x < -0.0996 ? guadeloupe :
      y >= -0.076 && y < -0.052 && x >= 0.0967 && x < 0.1371 ? mayotte :
      y >= -0.052 && y < -0.02 && x >= 0.0967 && x < 0.1371 ? reunion :
      europe).invert(coordinates);
  };

  conicConformalFrance.stream = function(stream) {
    return cache && cacheStream === stream ? cache : cache = multiplex([
      europe.stream(cacheStream = stream),
      guyane.stream(stream),
      martinique.stream(stream),
      guadeloupe.stream(stream),
      mayotte.stream(stream),
      reunion.stream(stream)
    ]);
  };

  conicConformalFrance.precision = function(_) {
    if (!arguments.length) { return europe.precision(); }
    europe.precision(_);
    guyane.precision(_);
    martinique.precision(_);
    guadeloupe.precision(_);
    mayotte.precision(_);
    reunion.precision(_);
    return reset();
  };

  conicConformalFrance.scale = function(_) {
    if (!arguments.length) { return europe.scale(); }
    europe.scale(_);
    guyane.scale(_ * 0.6);
    martinique.scale(_ * 1.6);
    guadeloupe.scale(_ * 1.4);
    mayotte.scale(_ * 1.6);
    reunion.scale(_ * 1.2);
    return conicConformalFrance.translate(europe.translate());
  };

  conicConformalFrance.translate = function(_) {
    if (!arguments.length) { return europe.translate(); }
    var k = europe.scale(),
      x = +_[0],
      y = +_[1];

    europePoint = europe
      .translate(_)
      .clipExtent([
        [x - 0.0996 * k, y - 0.0908 * k],
        [x + 0.0967 * k, y + 0.0864 * k]
      ])
      .stream(pointStream);


    guyanePoint = guyane
      .translate([x - 0.12 * k, y + 0.0575 * k])
      .clipExtent([
        [x - 0.14 * k + epsilon, y + 0.029 * k + epsilon],
        [x - 0.0996 * k - epsilon, y + 0.0864 * k - epsilon]
      ])
      .stream(pointStream);

    martiniquePoint = martinique
      .translate([x - 0.12 * k, y + 0.013 * k])
      .clipExtent([
        [x - 0.14 * k + epsilon, y + 0 * k + epsilon],
        [x - 0.0996 * k - epsilon, y + 0.029 * k - epsilon]
      ])
      .stream(pointStream);

    guadeloupePoint = guadeloupe
      .translate([x - 0.12 * k, y - 0.014 * k])
      .clipExtent([
        [x - 0.14 * k + epsilon, y - 0.032 * k + epsilon],
        [x - 0.0996 * k - epsilon, y + 0 * k - epsilon]
      ])
      .stream(pointStream);

    mayottePoint = mayotte
      .translate([x - 0.12 * k, y - 0.044 * k])
      .clipExtent([
        [x - 0.14 * k + epsilon, y - 0.052 * k + epsilon],
        [x - 0.0996 * k - epsilon, y - 0.032 * k - epsilon]
      ])
      .stream(pointStream);

    reunionPoint = reunion
      .translate([x - 0.12 * k, y - 0.065 * k])
      .clipExtent([
        [x - 0.14 * k + epsilon, y - 0.076 * k + epsilon],
        [x - 0.0996 * k - epsilon, y - 0.052 * k - epsilon]
      ])
      .stream(pointStream);

    return reset();
  };

  conicConformalFrance.fitExtent = function(extent, object) {
    return fitExtent(conicConformalFrance, extent, object);
  };

  conicConformalFrance.fitSize = function(size, object) {
    return fitSize(conicConformalFrance, size, object);
  };

  function reset() {
    cache = cacheStream = null;
    return conicConformalFrance;
  }

  conicConformalFrance.drawCompositionBorders = function(context) {

    /*
    console.log("var ul, ur, ld, ll;");
    var projs = [guyane, martinique, guadeloupe, mayotte, reunion, mayotte, reunion, nouvelleCaledonie, wallisFutuna, polynesie, polynesie2];
    for (var i in projs){
      var ul = europe.invert([projs[i].clipExtent()[0][0], projs[i].clipExtent()[0][1]]);
      var ur = europe.invert([projs[i].clipExtent()[1][0], projs[i].clipExtent()[0][1]]);
      var ld = europe.invert([projs[i].clipExtent()[1][0], projs[i].clipExtent()[1][1]]);
      var ll = europe.invert([projs[i].clipExtent()[0][0], projs[i].clipExtent()[1][1]]);

      console.log("ul = europe(["+ul+"]);");
      console.log("ur = europe(["+ur+"]);");
      console.log("ld = europe(["+ld+"]);");
      console.log("ll = europe(["+ll+"]);");

      console.log("context.moveTo(ul[0], ul[1]);");
      console.log("context.lineTo(ur[0], ur[1]);");
      console.log("context.lineTo(ld[0], ld[1]);");
      console.log("context.lineTo(ll[0], ll[1]);");
      console.log("context.closePath();");

    }*/

    var ul, ur, ld, ll;
    ul = europe([-7.938886725111036, 43.7219460918835]);
    ur = europe([-4.832080896458295, 44.12930268549372]);
    ld = europe([-4.205299743793263, 40.98096346967365]);
    ll = europe([-7.071796453126152, 40.610037319181444]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();
    ul = europe([-8.42751373617692, 45.32889452553031]);
    ur = europe([-5.18599305777107, 45.7566442062976]);
    ld = europe([-4.832080905154431, 44.129302726751426]);
    ll = europe([-7.938886737126192, 43.72194613263854]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();
    ul = europe([-9.012656899657046, 47.127733821030176]);
    ur = europe([-5.6105244772793155, 47.579777861410626]);
    ld = europe([-5.185993067168585, 45.756644248170346]);
    ll = europe([-8.427513749141811, 45.32889456686326]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();
    ul = europe([-9.405747558985553, 48.26506375557457]);
    ur = europe([-5.896175018439575, 48.733352850851624]);
    ld = europe([-5.610524487556043, 47.57977790393761]);
    ll = europe([-9.012656913808351, 47.127733862971255]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();
    ul = europe([-9.908436061346974, 49.642448789505856]);
    ur = europe([-6.262026716233124, 50.131426841787174]);
    ld = europe([-5.896175029331232, 48.73335289377258]);
    ll = europe([-9.40574757396393, 48.26506379787767]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();
    ul = europe([11.996907706504462, 50.16039028163579]);
    ur = europe([15.649907879773343, 49.68279246765253]);
    ld = europe([15.156712840526632, 48.30371557625831]);
    ll = europe([11.64122661754411, 48.761078240546816]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();
    ul = europe([11.641226606955788, 48.7610781975889]);
    ur = europe([15.156712825832164, 48.30371553390465]);
    ld = europe([14.549932166241172, 46.4866532486199]);
    ll = europe([11.204443787952183, 46.91899233914248]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();
    ul = europe([11.204443778297161, 46.918992296823646]);
    ur = europe([14.549932152815039, 46.486653206856396]);
    ld = europe([13.994409796764009, 44.695833444323256]);
    ll = europe([10.805306599253848, 45.105133870684924]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();
    ul = europe([10.805306590412085, 45.10513382903308]);
    ur = europe([13.99440978444733, 44.695833403183606]);
    ld = europe([13.654633799024392, 43.53552468558152]);
    ll = europe([10.561516803980956, 43.930671459798624]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();

    ul = europe([10.561516795617383, 43.93067141859757]);
    ur = europe([13.654633787361952, 43.5355246448671]);
    ld = europe([12.867691604239901, 40.640701985019405]);
    ll = europe([9.997809515987688, 41.00288343254471]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);
    context.lineTo(ld[0], ld[1]);
    context.lineTo(ll[0], ll[1]);
    context.closePath();

    ul = europe([10.8, 42.4]);
    ur = europe([12.8, 42.13]);
    context.moveTo(ul[0], ul[1]);
    context.lineTo(ur[0], ur[1]);

  };
  conicConformalFrance.getCompositionBorders = function() {
    var context = d3Path.path();
    this.drawCompositionBorders(context);
    return context.toString();
  };

  return conicConformalFrance.scale(2700);
}

exports.geoConicConformalFrance = conicConformalFrance;

Object.defineProperty(exports, '__esModule', { value: true });

})));
