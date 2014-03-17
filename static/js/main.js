"use strict";

var app = angular.module('twitto-feels', ['ngRoute']);

app.config(function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: '/partials/no_topic.html',
  }).when('/topics/:topicId', {
    templateUrl: '/partials/topic.html',
    controller: 'TopicCtrl'
  }).otherwise({
    redirectTo: '/'
  });
});

app.factory('ApiService', ['$q', '$http', function($q, $http) {
  function Service(baseURL) {
    this.baseURL = '/api' + baseURL;
  }

  Service.prototype.get = function() {
    var deferred = $q.defer();
    $http.get(this.baseURL)
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
    $http.put(this.baseURL, obj)
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

app.controller('TopicCtrl', ['$scope', '$routeParams', function($scope, $routeParams) {
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
