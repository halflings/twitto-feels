"use strict";

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

app.factory('ApiService', ['$q', '$http', function($q, $http) {
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
}]);

function makeBasicApiService(name, url) {
  return app.factory(name, ['ApiService', function(ApiService) {
    return new ApiService(url);
  }]);
}

makeBasicApiService('TopicsService', '/topics');
makeBasicApiService('TweetsService', '/tweets');

app.factory('FlashService', ['$timeout', function($timeout) {
  var flash = {};

  // Messages container
  flash.messages = [];

  // Possible types for flash messages
  flash.possibleTypes = ['success', 'danger', 'warning', 'info'];
  // and "none" type
  flash.noneType = 'none';

  // Timeout for message dismissal, in seconds
  flash.timeout = 1;

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
    obj.uid = ('0000' + (Math.random() * Math.pow(36,4) << 0).toString(36)).substr(-4);

    // Add "dismiss" method for flash messages
    obj.dismiss = function() {
      console.log('removing', obj, 'from', self.messages);
      for (var i = 0; i < self.messages.length; i++) {
        if (self.messages[i].uid == obj.uid) {
          console.log('at index', i);
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
}]);

app.controller('MainCtrl', function($scope, $http, TopicsService, TweetsService, FlashService) {
  $scope.topics = [];
  $scope.tweets = [];
  $scope.flashMessages = FlashService.messages;

  TopicsService.get().then(function(topics) {
    $scope.topics = topics;
  }, function() {
    FlashService.add('Topics loading failed', 'danger');
  });

  TweetsService.get().then(function(tweets) {
    $scope.tweets = tweets;
  }, function() {
    FlashService.add('Tweets loading failed', 'danger');
  });
});

app.controller('ViewTopicCtrl', function($scope, $routeParams, $location,
      $modal, TopicsService, FlashService) {

  // Find "current" topic
  angular.forEach($scope.topics, function(topic, index) {
    if (topic._id.$oid == $routeParams.topicId) {
      $scope.topicIndex = index;
      $scope.topic = topic;

      // Add "tweets" member for topic
      if (topic.tweets) { return; }
      topic.tweets = [];
      angular.forEach($scope.tweets, function(tweet) {
        if (tweet.topic.$oid == topic._id.$oid) {
          topic.tweets.push(tweet);
        }
      });
    }
  });

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
      TopicsService.delete($scope.topic).then(function() {
        $scope.topics.splice($scope.topicIndex, 1);
        $location.path('/');
      }, function() {
        FlashService.add('An error occurred while deleting the given topic', 'danger');
      });
    });
  };
});

app.controller('CreateTopicCtrl', function($scope, $location,
      TopicsService, FlashService) {
  $scope.name = '';
  $scope.tags = [];

  $scope.currentTag = '';
  $scope.addTag = function(tag) {
    tag = tag.toLowerCase().replace(/[^\w]/gi, '');
    if (!tag) {
      FlashService.add('Cannot add empty tag', 'warning');
    } else if ($scope.tags.indexOf(tag) != -1) {
      FlashService.add('Tag "' + tag + '" already added', 'warning');
    } else {
      $scope.tags.push(tag);
      $scope.currentTag = '';
    }
  };

  $scope.removeTag = function(index) { $scope.tags.splice(index, 1); };

  // Form validation
  $scope.submit = function() {
    var valid = true;

    // Validate name
    if (!$scope.name) {
      FlashService.add('No name provided for the topic', 'danger');
      valid = false;
    }

    // Validate tags
    if (!$scope.tags.length) {
      FlashService.add('No tags provided for the topic', 'danger');
      valid = false;
    }

    if (valid) { $scope.$submit(); }
  };
  // form submission
  $scope.$submit = function() {
    TopicsService.post({ name: $scope.name, tags: $scope.tags }).then(function(topic) {
      $scope.topics.push(topic);
      $location.path('/view_topic/' + topic._id.$oid);
    }, function() {
      FlashService.add('An error occurred while creating the given topic', 'danger');
    });
  };
});

app.controller('MapCtrl', function($scope) {
  $scope.map = {
    center: { latitude: 45, longitude: -73 },
    zoom: 8,
    events: {
      tilesloaded: function(map) {
        $scope.$apply(function() { $scope.onMapLoaded(map); });
      }
    }
  };

  $scope.topicZones = [];

  $scope.onMapLoaded = function(map) {
    $scope.mapInstance = map;
    console.log(map);

    $scope.topicZones.push(new google.maps.Circle({
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      map: map,
      center: new google.maps.LatLng(45, -73),
      radius: 142125
    }));
  };
});
