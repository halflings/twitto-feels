"use strict";

var app = angular.module('twitto-feels', ['ngRoute']);

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

app.controller('ViewTopicCtrl', ['$scope', '$routeParams', function($scope, $routeParams) {
  angular.forEach($scope.topics, function(topic) {
    if (topic._id.$oid == $routeParams.topicId) {
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
