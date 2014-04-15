'use strict';

function shortUID() {
  return ('0000' + (Math.random() * Math.pow(36,4) << 0).toString(36)).substr(-4);
}

var app = angular.module('twitto-feels', ['ngRoute', 'ngAnimate', 'ui.bootstrap', 'google-maps']);

app.config(function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: '/partials/home.html',
  }).when('/create_topic', {
    templateUrl: '/partials/create_topic.html',
    controller: 'CreateTopicCtrl'
  }).when('/view_topic/:topicId', {
    templateUrl: '/partials/view_topic.html',
    controller: 'ViewTopicCtrl'
  }).otherwise({
    redirectTo: '/'
  });
});

app.directive('ngEnter', function() {
  return function($scope, elem, attrs) {
    elem.bind('keydown keypress', function(evt) {
      if (evt.which === 13) {
        $scope.$apply(function (){
          $scope.$eval(attrs.ngEnter);
        });
        evt.preventDefault();
      }
    });
  };
});

app.factory('MongoApiService', function($q, $http) {
  function Service(basename) {
    this.basename = basename;
    this.baseURL = '/api/' + this.basename;
  }

  Service.prototype.create = function(obj) {
    var deferred = $q.defer();
    $http.post(this.baseURL, obj)
      .success(function(obj) { deferred.resolve(obj); })
      .error(function() { deferred.reject(); })
    ;
    return deferred.promise;
  };

  Service.prototype.read = function(id) {
    var deferred = $q.defer();
    $http.get((id !== undefined) ? this.baseURL + '/' + id : this.baseURL)
      .success(function(obj) { deferred.resolve(obj); })
      .error(function() { deferred.reject(); })
    ;
    return deferred.promise;
  };

  Service.prototype.update = function(obj) {
    var deferred = $q.defer();
    $http.put(this.baseURL + '/' + obj._id.$oid, obj)
      .success(function(obj) { deferred.resolve(obj); })
      .error(function() { deferred.reject(); })
    ;
    return deferred.promise;
  };

  Service.prototype.delete = function(obj) {
    var deferred = $q.defer();
    $http.delete(this.baseURL + '/' + obj._id.$oid)
      .success(function() { deferred.resolve(); })
      .error(function() { deferred.reject(); })
    ;
    return deferred.promise;
  };

  Service.prototype.query = function(type, query) {
    // Default arguments
    if (query === undefined) {
      query = type;
    } else {
      query.query = type;
    }

    // Argument checks
    if (query === undefined) {
      console.error('Bad argument "type": excepted query object or query'
          + ' type with extra query object argument');
      return;
    } else if (query.query === undefined) {
      console.error('Bad argument "type": excepted "query" key');
      return;
    }

    // Query
    var deferred = $q.defer();
    $http.post(this.baseURL + '/query', query)
      .success(function(obj) { deferred.resolve(obj); })
      .error(function() { deferred.reject(); })
    ;

    return deferred.promise;
  };

  Service.prototype.listRelated = function(type, obj) {
    return this.query('related', { on: type, pk: obj._id.$oid });
  };

  return Service;
});

app.factory('$api', function(MongoApiService, $q, $http) {
  return {
    topics: new MongoApiService('topics'),
    tweets: new MongoApiService('tweets'),

    // Collectors API resource (non-generic)
    collectors: {
      baseURL: '/api/collectors',
      pollURL: '/api/collector_polling',

      // list collectors
      // TODO get -> read
      get: function() {
        var deferred = $q.defer();
        $http.get(this.baseURL)
          .success(function(obj) { deferred.resolve(obj); })
          .error(function() { deferred.reject(); })
        ;
        return deferred.promise;
      },

      // create a new collector
      post: function(topic) {
        var deferred = $q.defer();
        $http.post(this.baseURL, { topic_id: topic._id.$oid })
          .success(function(obj) { deferred.resolve(obj); })
          .error(function() { deferred.reject(); })
        ;
        return deferred.promise;
      },

      // delete a collector
      delete: function(topic) {
        var deferred = $q.defer();
        $http.delete(this.baseURL + '/' + topic._id.$oid)
          .success(function() { deferred.resolve(); })
          .error(function() { deferred.reject(); })
        ;
        return deferred.promise;
      },

      // poll a collector for tweets
      poll: function(topic) {
        var deferred = $q.defer();
        $http.get(this.pollURL + '/' + topic._id.$oid)
          .success(function(obj) { deferred.resolve(obj); })
          .error(function() { deferred.reject(); })
        ;
        return deferred.promise;
      }
    }
  };
});

app.factory('$flash', function($timeout) {
  var flash = {};

  // Messages container
  flash.messages = [];

  // Possible types for flash messages
  flash.possibleTypes = ['success', 'danger', 'warning', 'info'];
  // and "none" type
  flash.noneType = 'none';

  // Timeout for message dismissal, in seconds
  flash.timeout = 3;

  flash.add = function(msg, type, timeout) {
    if (timeout === undefined) { timeout = self.timeout; }

    var self = this;

    // Default arguments
    var obj = {};
    if (type === undefined) {
      obj = (typeof(msg) == 'string') ? { text: msg } : msg;
    } else {
      obj.text = msg;
      obj.type = type;
    }

    // Check "type" member
    if (!obj.type) {
      obj.type = self.noneType;
    } else if (self.possibleTypes.indexOf(obj.type) == -1) {
      console.error('Undefined flash message type:', obj.type);
      obj.type = self.noneType;
    }

    // Add UID
    obj.uid = shortUID();

    // Add "dismiss" method for flash messages
    obj.dismiss = function() {
      for (var i = 0; i < self.messages.length; i++) {
        if (self.messages[i].uid == obj.uid) {
          self.messages.splice(i, 1);
          break;
        }
      }
    };
    self.messages.push(obj);

    // Finally, schedule dismissal
    if (timeout > 0) {
      $timeout(function() { obj.dismiss(); }, timeout * 1000);
    }
  };

  return flash;
});

app.controller('MainCtrl', function($scope, $http, $api, $flash) {
  $scope.topics = [];
  $scope.flashMessages = $flash.messages;

  $scope.reloadTopics = function() {
    $api.topics.read().then(function(topics) {
      $scope.topics = topics;
    }, function() {
      $flash.add('Topics loading failed', 'danger');
    });
  };
  $scope.reloadTopics();
});

app.controller('ViewTopicCtrl', function($scope, $routeParams, $location,
      $q, $api, $flash) {

  $scope.map = {
    center: { latitude: 0, longitude: 0 },
    zoom: 2,
    events: {
      tilesloaded: function(map) {
        $scope.map.instance = map;

        // Tweet markers on map
        $scope.$watch('tweets', function() {
          for (var i = 0; i < $scope.tweets.length; i++) {
            if (i >= 100) { break; } // MAGIIIIIC NUMBERS!!!

            var tweet = $scope.tweets[i];
            if (!tweet.location.length) { return; }
            $scope.map.markers.push(new google.maps.Marker({
              position: new google.maps.LatLng(tweet.location[0], tweet.location[1]),
              map: $scope.map.instance,
              title: tweet.status
            }));
          }
        });
      }
    },
    markers: []
  };

  $scope.tweets = [];

  // Load tweets for current topic
  $scope.reloadTweets = function(flashErrors) {
    if (flashErrors === undefined) { flashErrors = true; }

    if (!$scope.topic) {
      console.error('Current topic is undefined');
      return;
    }

    var deferred = $q.defer();
    $api.tweets.listRelated('topic', $scope.topic).then(function(tweets) {
      $scope.tweets = tweets;
      deferred.resolve();
    }, function() {
      $flash.add('Tweets loading failed', 'danger');
      deferred.reject();
    });
    return deferred.promise;
  };

  // Load current topic
  $scope.reloadCurrentTopic = function() {
    return $api.topics.read($routeParams.topicId).then(function(topic) {
      $scope.topic = topic;
    }, function() {
      $flash.add('Current topic loading failed', 'danger');
    });
  };

  // Load everything
  $scope.reloadCurrentTopic().then(function() {
    $scope.reloadTweets();
  });

  $scope.delete = function() {
    $api.topics.delete($scope.topic).then(function() {
      $scope.reloadTopics();
      $location.path('/');
    }, function() {
      $flash.add('An error occurred while deleting the given topic', 'danger');
    });
  };

  // Convert a polarity in [-1, 1] to a color from red to green
  $scope.polarityColor = function(polarity) {
    if (polarity == 0) { return '#ffffff' }

    // Compute color component for polarity opposite colors
    var component = (function(ratio) {
      var repr = Math.round(ratio * 255).toString(16);
      if (repr.length < 2) { repr = '0' + repr; }
      return repr;
    }) (1 - Math.abs(polarity));

    return (polarity > 0)
      ? '#' + component + 'ff' + component
      : '#' + 'ff' + component + component;
  };
});

app.controller('TopicControlsCtrl', function($scope, $timeout, $modal, $api, $flash) {

  // Collectors reloading
  $scope.reloadCollectors = function() {
    $api.collectors.get().then(function(collectors) {
      $scope.collectors = collectors;
    }, function() {
      $flash.add('Collectors loading failed', 'danger');
    });
  };
  $scope.reloadCollectors();

  // Collector state (running/paused)
  $scope.collecting = false;
  $scope.$watch('collectors', function() {
    if (!$scope.topic) {
      $scope.collecting = false;
    } else {
      $scope.collecting = $scope.collectors.indexOf($scope.topic._id.$oid) != -1;
    }
  });

  $scope.pollTweets = function(delay) {
    if (delay === undefined) { delay = 1000; }

    function doPoll() {
      $api.collectors.poll($scope.topic).then(function(tweet) {
        $scope.tweets.push(tweet);
        $scope.tweetPolling = $timeout(doPoll, delay);
      }, function() {
        $scope.stopPollingTweets();
        $flash.add('Tweet polling stopped (unexpected error), reload page to restart', 'danger', 0);
      });
    }

    // Start the poll!
    doPoll();
  };

  $scope.stopPollingTweets = function() {
    $timeout.cancel($scope.tweetPolling);
  };

  // Toggle collector state
  $scope.toggleCollecting = function() {
    if (!$scope.topic) {
      $flash.add('Please wait for current topic to be completely loaded', 'danger');
      return;
    }

    // Toggle!
    var promise;
    if ($scope.collecting) {
      promise = $api.collectors.delete($scope.topic);
    } else {
      promise = $api.collectors.post($scope.topic);
    }

    var savedState = $scope.collecting;
    promise.then(function() {
      if ($scope.collecting) {
        $scope.pollTweets();
      } else {
        $scope.stopPollingTweets();
      }
    }, function() {
      $scope.collecting = savedState;
    });
    // apply immediately
    $scope.collecting = !$scope.collecting;
  };

  // Delete current topic
  $scope.requestDelete = function() {
    var modalInstance = $modal.open({
      templateUrl: 'confirm_topic_deletion.html',
      controller: function($scope, $modalInstance) {
        $scope.confirm = function () {
          $modalInstance.close(true);
        };

        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }
    });

    modalInstance.result.then(function(confirmed) {
      if (!confirmed) { return; }
      $scope.delete();
    });
  };
});

// TODO big refactor needed, this controller is *way* too big
app.controller('CreateTopicCtrl', function($scope, $location,
      $api, $flash) {
  $scope.name = '';

  // Tags
  $scope.tags = [];

  $scope.currentTag = '';
  $scope.addTag = function(tag) {
    tag = tag.toLowerCase().replace(/[^\w]/gi, '');
    if (!tag) {
      $flash.add('Cannot add empty tag', 'warning');
    } else if ($scope.tags.indexOf(tag) != -1) {
      $flash.add('Tag "' + tag + '" already added', 'warning');
    } else {
      $scope.tags.push(tag);
      $scope.currentTag = '';
    }
  };
  $scope.removeTag = function(index) {
    $scope.tags.splice(index, 1);
  };

  // Locations
  $scope.map = {
    center: { latitude: 0, longitude: 0 },
    zoom: 1,
    events: {
      tilesloaded: function(map) {
        $scope.map.instance = map;
      }
    }
  };

  $scope.locations = [];

  $scope.addLocation = function() {
    if (!$scope.map.instance) {
      $flash.add('Please wait for map to load !', 'warning');
    }

    var rectangle = new google.maps.Rectangle({
      map: $scope.map.instance,
      strokeColor: '#428bca', strokeOpacity: 0.8, strokeWeight: 2,
      fillColor: '#428bca', fillOpacity: 0.35,
      bounds: $scope.map.instance.getBounds(),
      editable: true,
      draggable: true
    });

    var loc = {
      uid: shortUID(),
      rectangle: rectangle,
      sw: {
        lat: rectangle.bounds.getSouthWest().lat(),
        lng: rectangle.bounds.getSouthWest().lng()
      }, ne: {
        lat: rectangle.bounds.getNorthEast().lat(),
        lng: rectangle.bounds.getNorthEast().lng()
      }
    };

    google.maps.event.addListener(rectangle, 'bounds_changed', function() {
      $scope.$apply(function() {
        loc.sw.lat = rectangle.bounds.getSouthWest().lat();
        loc.sw.lng = rectangle.bounds.getSouthWest().lng();
        loc.ne.lat = rectangle.bounds.getNorthEast().lat();
        loc.ne.lng = rectangle.bounds.getNorthEast().lng();
      });
    });

    google.maps.event.addListener(rectangle, 'click', function() {
      $scope.$apply(function() {
        $scope.selectLocation(loc);
      });
    });

    $scope.locations.push(loc);
  };

  $scope.selectedLocation = null;
  $scope.selectLocation = function(loc) {
    $scope.selectedLocation = loc;
  };

  $scope.removeSelectedLocation = function() {
    if (!$scope.selectedLocation) { return; }
    $scope.removeLocation($scope.selectedLocation);
    $scope.selectedLocation = null;
  };

  $scope.removeLocation = function(loc) {
    for (var i = 0; i < $scope.locations.length; i++) {
      if ($scope.locations[i].uid == loc.uid) {
        loc.rectangle.setMap(null);
        $scope.locations.splice(i,  1);
        break;
      }
    }
  };

  // Form validation
  $scope.submit = function() {
    var errors = [];

    // Validate required fields
    if (!$scope.name) { errors.push('name'); }
    if (!$scope.tags.length) { errors.push('tags'); }

    if (errors.length > 0) {
      $flash.add('Cannot create topic: ' + errors.join(', ') + ' have errors', 'danger');
    } else {
      $scope.$submit();
    }
  };
  // form submission
  $scope.$submit = function() {
    $api.topics.create({
      name: $scope.name,
      tags: $scope.tags,
      locations: (function() {
        var locations = [];
        angular.forEach($scope.locations, function(loc) {
          locations.push(
            loc.sw.lng,
            loc.sw.lat,
            loc.ne.lng,
            loc.ne.lat
          );
        });
        return locations;
      })()
    }).then(function(topic) {
      $scope.topics.push(topic);
      $location.path('/view_topic/' + topic._id.$oid);
    }, function() {
      $flash.add('An error occurred while creating the given topic', 'danger');
    });
  };
});
