"use strict";

var app = angular.module('twitto-feels', ['ngRoute', 'ui.bootstrap', 'google-maps']);

app.config(function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: '/partials/no_topic.html',
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

app.controller('MainCtrl', ['$scope', '$http', 'TopicsService', 'TweetsService',
    function($scope, $http, TopicsService, TweetsService) {
  $scope.topics = [];
  $scope.tweets = [];
  $scope.errors = [];
  $scope.errors.$push = $scope.errors.push;
  $scope.errors.push = function(obj) {
    if (this.indexOf(obj) == -1) {
      this.$push(obj);
    }
  };

  TopicsService.get().then(function(topics) {
    $scope.topics = topics;
  }, function() {
    $scope.errors.push('Topics loading failed');
  });

  TweetsService.get().then(function(tweets) {
    $scope.tweets = tweets;
  }, function() {
    $scope.errors.push('Tweets loading failed');
  });

  $scope.dismissError = function(index) {
    $scope.errors.splice(index, 1);
  };
}]);

app.controller('ViewTopicCtrl', ['$scope', '$routeParams', '$location', '$modal', 'TopicsService',
    function($scope, $routeParams, $location, $modal, TopicsService) {

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
        $scope.errors.push('An error occurred while deleting the given topic');
      });
    });
  };
}]);

app.controller('CreateTopicCtrl', ['$scope', '$location', 'TopicsService',
    function($scope, $location, TopicsService) {
  $scope.name = '';
  $scope.tags = [];

  $scope.currentTag = '';
  $scope.addTag = function(tag) {
    tag = tag.toLowerCase().replace(/[^\w]/gi, '');
    if ($scope.tags.indexOf(tag) != -1) {
      $scope.errors.push('Tag "' + tag + '" already added');
      return;
    }
    $scope.tags.push(tag);
    $scope.currentTag = '';
  };

  $scope.removeTag = function(index) {
    $scope.tags.splice(index, 1);
  };

  $scope.submit = function() {
    var valid = true;

    // Validate name
    if (!$scope.name) {
      $scope.errors.push('No name provided for the topic');
      valid = false;
    }

    // Validate tags
    if (!$scope.tags.length) {
      $scope.errors.push('No tags provided for the topic');
      valid = false;
    }

    if (valid) { $scope.$submit(); }
  };

  $scope.$submit = function() {
    TopicsService.post({ name: $scope.name, tags: $scope.tags }).then(function(topic) {
      $scope.topics.push(topic);
      $location.path('/view_topic/' + topic._id.$oid);
    }, function() {
      $scope.errors.push('An error occurred while creating the given topic');
    });
  };
}]);

app.controller('MapCtrl', ['$scope', function($scope) {
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
}]);
