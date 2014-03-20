"use strict";

function shortUID() {
  return ('0000' + (Math.random() * Math.pow(36,4) << 0).toString(36)).substr(-4);
}

var app = angular.module('twitto-feels', ['ngRoute', 'ui.bootstrap', 'google-maps']);

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
    elem.bind("keydown keypress", function(evt) {
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
  function Service(baseURL) {
    this.baseURL = '/api' + baseURL;
  }

  Service.prototype.get = function(id) {
    var deferred = $q.defer();
    $http.get((id !== undefined) ? this.baseURL + '/' + id : this.baseURL)
      .success(function(obj) { deferred.resolve(obj); })
      .error(function() { deferred.reject(); })
    ;
    return deferred.promise;
  };

  Service.prototype.post = function(obj) {
    var deferred = $q.defer();
    $http.post(this.baseURL, obj)
      .success(function(obj) { deferred.resolve(obj); })
      .error(function() { deferred.reject(); })
    ;
    return deferred.promise;
  };

  Service.prototype.put = function(obj) {
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

  return Service;
});

app.factory('$topics', function(MongoApiService, $tweets) {
  var service = new MongoApiService('/topics');

  service.tweets = function(topic) {
    return $tweets.forTopic(topic);
  };

  return service;
});

app.factory('$tweets', function(MongoApiService, $q, $http) {
  var service = new MongoApiService('/tweets');

  service.forTopic = function(topic) {
    var deferred = $q.defer();
    $http.post(this.baseURL + '/query', { topic: topic._id.$oid })
      .success(function(obj) { deferred.resolve(obj); })
      .error(function() { deferred.reject(); })
    ;
    return deferred.promise;
  };

  return service;
});

app.factory('CollectorService', function($q, $http) {
  var service = {};

  service.getRunning = function() {
  };

  service.isRunning = function() {
  };

  return service;
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
  flash.timeout = 0;

  flash.add = function(msg, type) {
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
    if (!obj.type || self.possibleTypes.indexOf(obj.type) == -1) {
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
    if (self.timeout > 0) {
      $timeout(function() { obj.dismiss(); }, self.timeout * 1000);
    }
  };

  return flash;
});

app.controller('MainCtrl', function($scope, $http, $topics, $flash) {
  $scope.topics = [];
  $scope.flashMessages = $flash.messages;

  $scope.reloadTopics = function() {
    $topics.get().then(function(topics) {
      $scope.topics = topics;
    }, function() {
      $flash.add('Topics loading failed', 'danger');
    });
  };
  $scope.reloadTopics();
});

app.controller('ViewTopicCtrl', function($scope, $routeParams, $location, $topics, $tweets, $flash) {

  $scope.map = {
    center: { latitude: 33.678176, longitude: -116.242568 },
    zoom: 11,
    events: {
      tilesloaded: function(map) {
        $scope.map.instance = map;
      }
    }
  };

  $scope.tweets = [];

  // Load tweets for current topic
  $scope.reloadTweets = function() {
    if (!$scope.topic) {
      console.error('Current topic is undefined');
      return;
    }

    return $tweets.forTopic($scope.topic).then(function(tweets) {
      console.log(tweets);
      $scope.tweets = tweets;
    }, function() {
      $flash.add('Tweets loading failed', 'danger');
    });
  };

  // Load current topic
  $scope.reloadCurrentTopic = function() {
    return $topics.get($routeParams.topicId).then(function(topic) {
      $scope.topic = topic;
    }, function() {
      $flash.add('Current topic loading failed', 'danger');
    });
  };

  // Load everything
  $scope.reloadCurrentTopic().then(function() {
    $scope.reloadTweets();
  });

  // Markers for map
  $scope.$watch('tweets', function() {
    var markers = [];
    angular.forEach($scope.tweets, function(tweet) {
      markers.push({ longitude: tweet.location[1], latitude: tweet.location[0] });
    });

    // Hack to fix buggy display of over 100 values
    // (https://github.com/nlaplante/angular-google-maps/issues/16#issuecomment-38174956)
    var maxValues = 100;
    if (markers.length > maxValues) {
      markers = _.shuffle(markers);
      markers.splice(0, markers.length - maxValues);
    }

    $scope.map.markers = markers;
  });

  $scope.delete = function() {
    $topics.delete($scope.topic).then(function() {
      $scope.reloadTopics();
      $location.path('/');
    }, function() {
      $flash.add('An error occurred while deleting the given topic', 'danger');
    });
  };
});

app.controller('TopicControlsCtrl', function($scope, $modal) {
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

app.controller('CreateTopicCtrl', function($scope, $location,
      $topics, $flash) {
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
    center: { latitude: 33.678176, longitude: -116.242568 },
    zoom: 11,
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
    var valid = true;

    // Validate name
    if (!$scope.name) {
      $flash.add('No name provided for the topic', 'danger');
      valid = false;
    }

    // Validate tags
    if (!$scope.tags.length) {
      $flash.add('No tags provided for the topic', 'danger');
      valid = false;
    }

    if (valid) { $scope.$submit(); }
  };
  // form submission
  $scope.$submit = function() {
    $topics.post({
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
