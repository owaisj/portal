(function(window, angular, $, _) {
  "use strict";

  var module = angular.module('ng.designsafe');

  module.directive('dsDataBrowser', ['Logging', function(Logging) {
    var logger = Logging.getLogger('ngDesignSafe.dsDataBrowser');

    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser.html',
      scope: {
        resource: '=resource',  /* the data source to initialize with */
        fileId: '=fileId'  /* the id to initialize with */
      },
      controller: ['$scope', 'Django', 'DataService', function($scope, Django, DataService) {

        $scope.data = {
          listing: Django.context.listing || [],
          sources: Django.context.sources || []
        };

        $scope.state = {
          selecting: false,
          selected: {},
          hover: {}
        };

        var self = this;

        self.getIconClass = function(file, hover) {
          if ($scope.state.selecting || hover) {
            if ($scope.state.selected[file.id]) {
              return 'fa-check-circle';
            } else {
              return 'fa-circle-o';
            }
          }
          return DataService.getIcon(file.type, file.ext);
        };

        self.selectAll = function() {
          if ($scope.state.selectAll) {
            self.clearSelection();
          } else {
            $scope.state.selected = _.chain($scope.data.listing.children)
              .pluck('id').map(function (id) { return [id, true]; })
              .object()
              .value();
            $scope.state.selectAll = $scope.state.selecting = true;
          }
        };

        self.selectFile = function(file) {
          if ($scope.state.selected[file.id]) {
            delete $scope.state.selected[file.id];
          } else {
            $scope.state.selected[file.id] = true;
          }

          if (Object.keys($scope.state.selected).length === 0) {
            self.clearSelection();
          } else {
            $scope.state.selecting = true;
            $scope.state.selectAll = false;
          }
        };

        self.clearSelection = function() {
          $scope.state.selected = {};
          $scope.state.selectAll = $scope.state.selecting = false;
        };

        self.listFiles = function(options) {
          options = options || {}

          if (options.resource) {
            $scope.resource = options.resource;
          }

          if (options.fileId) {
            $scope.fileId = options.fileId;
          }

          DataService.listFiles({resource: $scope.resource, file_path: $scope.fileId}).then(
            function(response) {
              $scope.data.listing = response.data.listing;
            },
            function(error) {
              logger.error(error);
            }
          );
        };

        DataService.listSources().then(
          function(response) {
            $scope.data.sources = response.data;
          },
          function(error) {
            logger.error(error);
          }
        );

        self.listFiles();
      }]
    };
  }]);

  module.directive('dsDataBrowserSourceSelect', ['Logging', function(Logging) {

    var logger = Logging.getLogger('ngDesignSafe.dsDataBrowserSourceSelect');

    return {
      require: '^^dsDataBrowser',
      restrict: 'E',
      replace: true,
      templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser-source-select.html',
      scope: {},
      link: function(scope, element, attrs, dbCtrl) {
        scope.state = scope.$parent.$parent.state;
        scope.data = scope.$parent.$parent.data;
        scope.getIconClass = dbCtrl.getIconClass;
        scope.selectAll = dbCtrl.selectAll;
        scope.selectFile = dbCtrl.selectFile;
        scope.clearSelection = dbCtrl.clearSelection;

        scope.selectSource = function(source) {
          logger.debug(source);
        };
      }
    };
  }]);

  module.directive('dsDataBrowserToolbar', ['Logging', function(Logging) {

    var logger = Logging.getLogger('ngDesignSafe.dsDataBrowserToolbar');

    return {
      require: '^^dsDataBrowser',
      restrict: 'E',
      replace: true,
      templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser-toolbar.html',
      scope: {},
      link: function(scope, element, attrs, dbCtrl) {
        scope.state = scope.$parent.$parent.state;
        scope.data = scope.$parent.$parent.data;
        scope.getIconClass = dbCtrl.getIconClass;
        scope.selectAll = dbCtrl.selectAll;
        scope.selectFile = dbCtrl.selectFile;
        scope.clearSelection = dbCtrl.clearSelection;
        
        scope.selectTrail = function($event, trailItem) {
          $event.preventDefault();
          dbCtrl.listFiles({fileId: trailItem.id});
        };
      }
    };
  }]);

  module.directive('dsDataListDisplay', ['Logging', function(Logging) {
    
    var logger = Logging.getLogger('ngDesignSafe.dsDataListDisplay');

    return {
      require: '^^dsDataBrowser',
      restrict: 'E',
      replace: true,
      templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser-list-display.html',
      scope: {},
      link: function(scope, element, attrs, dbCtrl) {
        scope.state = scope.$parent.$parent.state;
        scope.data = scope.$parent.$parent.data;
        scope.getIconClass = dbCtrl.getIconClass;
        scope.selectAll = dbCtrl.selectAll;
        scope.selectFile = dbCtrl.selectFile;
        scope.clearSelection = dbCtrl.clearSelection;

        scope.browseFile = function($event, file) {
          $event.preventDefault();
          if (file.type === 'folder') {
            dbCtrl.listFiles({fileId: file.id});
          }
        };
      }
    };
    
  }]);
})(window, angular, jQuery, _);
