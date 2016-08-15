(function() {
  'use strict'

  angular.module('ui.tree.select', ['ui.tree'])

  .directive('uiTreeSelect', [
    '$document',
    '$filter',
    '$sce',
    '$timeout',
    '$window',
    function(
      $document,
      $filter,
      $sce,
      $timeout,
      $window
    ) {
      return {
        restrict: 'E',
        scope: {
          bind: '=',
          placeholderText: '@',
          deselectAllText: '@',
          fieldName: '@',
          includeNone: '=',
          isCell: '@',
          itemsSelectedText: '@',
          multiSelect: '@',
          nodeChildren: '@',
          nodeId: '@',
          nodeLabel: '@',
          nodePath: '@',
          noneText: '@',
          onClose: '=',
          onSelect: '=',
          selectAllText: '@',
          treeModel: '=',
          useNodePath: '='
        },
        templateUrl: '/uiTreeSelect.html',
        link: function(scope, element, attrs) {
          var fromIndex, endIndex;
          var originalPlaceholderText = scope.placeholderText;
          scope.show = false;
          scope.picker = element.find('.tree-select-picker');
          scope.input = element.find('input');
          scope.filterTree = filterTree;
          scope.trustAsHtml = trustAsHtml;
          scope.openPicker = openPicker;
          scope.closePicker = closePicker;
          scope.selectNode = selectNode;
          scope.isChecked = isChecked;
          scope.selectAll = selectAll;
          scope.deselectAll = deselectAll;
          scope.toggleNone = toggleNone;
          scope.isNoneIncluded = isNoneIncluded;

          if (attrs.className) {
            scope.picker.addClass(attrs.className);
          }

          if (attrs.position === 'absolute') {
            scope.picker.appendTo($document.find('body'));
          }

          if (scope.isCell) {
            element.find('input').attr('placeholder', '');
            scope.input.on('click', scope.openPicker);
          } else {
            scope.input.on('focus', scope.openPicker);
          }

          scope.$watch('bind', setSelectionPhrase);
          scope.$watch('show', doOnShowChange);
          scope.$watch('selectionPhrase', resetSelectionCandidates);

          function filterTree(node) {
            node.searchLabel = node[scope.nodeLabel];
            node.collapsed = true;
            setMatchedNodes();

            if (scope.selectionPhrase) {
              if (doesNodeContain(node, getMatchedNodes())) {
                node.collapsed = false;
              } else {
                node.collapsed = true;
              }

              var reg = new RegExp(scope.selectionPhrase.
                replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1').
                split('>').pop().trim(), 'gi');

              if (reg.test(node[scope.nodeLabel])) {
                node.searchLabel = node[scope.nodeLabel].
                  replace(reg, '<span class="ui-select-highlight">$&</span>');

                scope.selectionCandidates.push(node);
              }
            }

            return node;
          }

          function trustAsHtml(htmlString) {
            return $sce.trustAsHtml(htmlString);
          }

          function openPicker() {
            if (!scope.show) {
              scope.$apply(function() {
                scope.show = true;
              });

              $document.on('click', clickHandler);
              $document.on('keydown', keydownHandler);

              updatePlaceholder();
            }
          }

          function closePicker() {
            attrs.show = false;
            if (scope.show) {
              scope.show = false;

              $timeout(function() {
                scope.$digest();
                scope.input.blur();
              });

              setSelectionPhrase(scope.bind);

              if (angular.isFunction(scope.onClose)) {
                scope.onClose();
              }

              $document.off('click', clickHandler);
              $document.off('keydown', keydownHandler);

              updatePlaceholder();
            }
          }

          function updatePlaceholder() {
            if (scope.show) {
              scope.placeholderText = originalPlaceholderText;
            } else if (scope.multiSelect) {
              scope.placeholderText =
                scope.bind.length + ' ' +
                (scope.itemsSelectedText || 'items selected');
            }
          }

          function isChecked(node) {
            return (scope.multiSelect && _.find(scope.bind, { uuid: node.uuid }));
          }

          function selectAll() {
            if (scope.multiSelect) {
              deselectAll();
              flattenLocations(searchResults()).forEach(function(item) {
                scope.bind.push(item);
              });
              scope.includeNone = true;
              onSelect();
            }
          }

          function deselectAll() {
            if (scope.multiSelect) {
              scope.bind.length = 0;
              scope.includeNone = false;
              onSelect();
            }
          }

          function toggleNone() {
            if (scope.multiSelect) {
              scope.includeNone = !scope.includeNone;
              onSelect();
            }
          }

          function isNoneIncluded() {
            return scope.includeNone;
          }

          function onSelect() {
            if (angular.isFunction(scope.onSelect)) {
              $timeout(scope.onSelect);
            }
          }

          function clickHandler(event) {
            var targetElement = angular.element(event.target);
            var treeElement = targetElement.closest('.tree-select-picker');

            if (targetElement[0] !== scope.input[0] && !treeElement[0]) {
              handleClickOutside();
            }

            return true;
          }

          function keydownHandler(event) {
            switch (event.keyCode) {
            case 27://escape
              scope.closePicker();
              break;
            case 13://enter
              handleEnterKey();
              break;
            }

            return true;
          }

          function handleClickOutside() {
            if (scope.selectionPhrase === '') {
              setBind(null);
            }

            scope.closePicker();
          }

          function handleEnterKey() {
            if (scope.selectionPhrase === '') {
              setBind(null);
            } else if (scope.selectionCandidates.length > 0) {
              setBind(scope.selectionCandidates[0]);
            }

            scope.closePicker();
          }

          function calculatePosition() {
            var offset = scope.input.offset();
            var height = scope.input.outerHeight();

            var top = offset.top + height + 2;
            var left = offset.left;

            if (isPickerOutBound()) {
              var inputRightPosition = offset.left + scope.input.outerWidth();
              left = inputRightPosition - parseFloat(scope.picker.outerWidth());
            }

            return {
              top: top,
              left: left
            };
          }

          function isPickerOutBound() {
            var pickerRightPosition =
              scope.input.offset().left + parseFloat(scope.picker.outerWidth());

            return pickerRightPosition > $window.innerWidth;
          }

          function searchResults() {
            return $filter('filter')(scope.treeModel, scope.filterTree);
          }

          function setBind(value) {
            if (scope.multiSelect && value) {
              var filteredLocations = flattenLocations(searchResults());
              endIndex = _.findIndex(filteredLocations, value);
              if (firstClickOnList()) {
                fromIndex = endIndex;
              }
              if (event.shiftKey && fromIndex !== endIndex) {
                selectRange(filteredLocations);
              } else {
                fromIndex = endIndex;
                if (_.find(scope.bind, { uuid: value.uuid })) {
                  _.remove(scope.bind, { uuid: value.uuid });
                } else {
                  scope.bind.push(value);
                }
              }
            } else {
              if (value && value.isNone) {
                value = null;
              }
              scope.bind = value;
            }

            if (angular.isFunction(scope.onSelect)) {
              scope.onSelect(scope.fieldName, value);
            }

            function firstClickOnList() {
              return _.isNull(fromIndex) || angular.isUndefined(fromIndex);
            }

            function selectRange(filteredLocations) {
              var itemsToInsert = _.slice(
                filteredLocations,
                fromIndex,
                endIndex + 1
              );

              itemsToInsert.forEach(function(item) {
                if (!_.find(scope.bind, { uuid: item.uuid })) {
                  scope.bind.push(item);
                }
              });
            }
          }

          function selectNode(node) {
            if (node) {
              setBind(node);

              if (!scope.multiSelect) {
                closePicker();
              }
            }
          }

          function setSelectionPhrase(value) {
            if (value) {
              if (scope.useNodePath && scope.nodePath) {
                scope.selectionPhrase = value[scope.nodePath];
              } else {
                scope.selectionPhrase = value[scope.nodeLabel];
              }
            } else {
              scope.selectionPhrase = '';
            }
          }

          function resetSelectionCandidates() {
            scope.selectionCandidates = [];
            scrollTree();
          }

          function doOnShowChange(value) {
            if (value) {
              if (attrs.position === 'absolute') {
                scope.picker[0].style.top = calculatePosition().top + 'px';
                scope.picker[0].style.left = calculatePosition().left + 'px';
              }

              scrollTree();
            }
          }

          function doesNodeContain(node, nodesList) {
            for (var i = 0; i< nodesList.length; i++) {
              if (angular.equals(node, nodesList[i]) ||
                jsonSearch(nodesList[i][scope.nodePath], node).length > 0) {
                return true;
              }
            }

            return false;
          }

          function scrollTree() {
            $timeout(function() {
              scrollNode(getMatchedNodes()[0]);
            });
          }

          function scrollNode(node) {
            if (node) {
              var nodeElement = scope.picker.find(
                '[node-id="' + node[scope.nodeId] + '"]'
              )[0];

              if (nodeElement) {
                nodeElement.scrollIntoView();
              }
            }
          }

          function getMatchedNodes() {
            if (_.some(scope.matchedNodes)) {
              return scope.matchedNodes;
            } else {
              return [ scope.treeModel[0] ];
            }
          }

          function setMatchedNodes() {
            if (scope.selectionPhrase) {
              scope.matchedNodes = jsonSearch(
                scope.selectionPhrase, scope.treeModel);
            } else {
              scope.matchedNodes = [ scope.treeModel[0] ];
            }
          }

          function flattenLocations(locations) {
            var result = [];

            recursiveFlatten(locations);

            function recursiveFlatten(locations) {
              locations.forEach(function(location) {
                result.push(location);
                if (location.children) {
                  recursiveFlatten(location.children);
                }
              });
            }
            return result;
          }

          function jsonSearch(expression, obj) {
            var expr = '..{.' + scope.nodePath + ' *="' + expression + '"}';

            return JSPath.apply(expr, obj);
          }
        }
      };
    }
  ]);
})();
