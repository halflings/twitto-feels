"use strict";

var app = angular.module('twitto-feels', ['ngRoute']);

app.config(function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: '/static/partials/no_topic.html',
  }).when('/topics/:topicId', {
    templateUrl: '/static/partials/topic.html',
    controller: 'TopicCtrl'
  }).otherwise({
    redirectTo: '/'
  });
});

app.factory('ApiService', ['$q', '$http', function($q, $http) {
  function Service(baseURL) {
    this.baseURL = baseURL;
  }

  Service.prototype.get = function() {
    var deferred = $q.defer();
    $http.get(this.baseURL)
      .success(function(data) { deferred.resolve(data); })
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

  TopicsService.get().then(function(topics) {
    $scope.topics = topics;
  }, function() {
    console.log('error while loading topics');
  });

  TweetsService.get().then(function(tweets) {
    $scope.tweets = tweets;
  }, function() {
    console.log('error while loading tweets');
  });
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
