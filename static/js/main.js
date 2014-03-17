var app = angular.module('twitto-feels', []);

app.directive('a', function() {
  return {
    restrict: 'E',
    link: function(scope, elem, attrs) {
      if (attrs.ngClick || attrs.href === '' || attrs.href === '#') {
        elem.on('click', function(e){
          e.preventDefault();
          if (attrs.ngClick){
            scope.$eval(attrs.ngClick);
          }
        });
      }
    }
  };
});

function TopicsCtrl($scope, $http) {
  $scope.topics = [];

  $http.get('/topics').success(function(topics) {
    $scope.topics = topics;

    // Broadcast
    $scope.$broadcast('topicsUpdated', topics);
  }).error(function() {
    console.log('error while loading topics');
  });

  $scope.viewTopic = function(topic) {
    $scope.currentTopic = topic;
  }
}

function TweetsCtrl($scope, $http) {
  $scope.tweets = [];

  // All (cached) tweets
  $scope.allTweets = [];
  $http.get('/tweets').success(function(tweets) {
    $scope.allTweets = tweets;

    // Broadcast
    $scope.$broadcast('allTweetsUpdated', tweets);
  }).error(function() {
    console.log('error while loading tweets');
  });

  $scope.$watch('currentTopic', function() {
    var topic = $scope.currentTopic;
    if (!topic || !$scope.allTweets) { return; }
      $scope.tweets = [];
    angular.forEach($scope.allTweets, function(tweet) {
      if (tweet.topic.$oid == topic._id.$oid) {
        $scope.tweets.push(tweet);
      }
    });
  });
}
