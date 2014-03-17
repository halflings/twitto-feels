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
  });

  $scope.viewTopic = function(topic) {
    $scope.currentTopic = topic;
  }
}
