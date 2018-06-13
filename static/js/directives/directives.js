/*
 * StorageGRID Data Management Console (DMC)
 *
 * Copyright (c) 2018, NetApp, Inc.
 *
 * Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)
 *
 * Parts of this file are based on angular-filemanager: https://github.com/joni2back/angular-filemanager/
 *
 * Copyright (c) 2013 joni2back
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function (angular) {
    'use strict';
    var app = angular.module('DMCApp');

    app.directive('angularFilemanager', ['$parse', 'fileManagerConfig', function ($parse, fileManagerConfig) {
        return {
            restrict: 'EA',
            templateUrl: fileManagerConfig.tplPath + '/main.html'
        };
    }]);

    app.directive('ngRightClick', ['$parse', function ($parse) {
        return function (scope, element, attrs) {
            var fn = $parse(attrs.ngRightClick);
            element.bind('contextmenu', function (event) {
                scope.$apply(function () {
                    event.preventDefault();
                    fn(scope, { $event: event });
                });
            });
        };
    }]);

    app.directive('multipleOf', [function () {
        var link = function ($scope, $element, $attrs, ctrl) {
            var validate = function (markerSize) {
                var pageSize = $attrs.multipleOf;

                if (!pageSize || !markerSize) {
                    ctrl.$setValidity('multipleOfPageSize', true);
                }

                ctrl.$setValidity('multipleOfPageSize', markerSize%pageSize === 0);
                return markerSize;
            };

            ctrl.$parsers.unshift(validate);
            ctrl.$formatters.push(validate);

            $attrs.$observe('multipleOf', function (pageSize) {
                return validate(ctrl.$viewValue);
            });
        };

        return {
            require: 'ngModel',
            link: link
        };
    }]);

    app.directive('bucketNameValidator', ['$parse', '$filter', function ($parse, $filter) {
        var link = function ($scope, $element, $attrs, ctrl) {
            var validate = function (bucketName) {
                var bucketlist = $parse($attrs.bucketlist)($scope);
                var rules = [
                    {
                        regex: new RegExp(/^[a-z0-9.\-]*$/),
                        validator: 'bucketnamerule1',
                        check: false
                    },
                    {
                        regex: new RegExp(/^[a-z0-9]/),
                        validator: 'bucketnamerule2',
                        check: false
                    },
                    {
                        regex: new RegExp(/^.*(\-\.|\.\-).*$/),
                        validator: 'bucketnamerule3',
                        check: true
                    },
                    {
                        regex: new RegExp(/.*(\.{2}).*$/),
                        validator: 'bucketnamerule4',
                        check: true
                    },
                    {
                        regex: new RegExp(/.*(\-|\.)$/),
                        validator: 'bucketnamerule5',
                        check: true
                    },
                    {
                        regex: new RegExp(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/),
                        validator: 'bucketnamerule6',
                        check: true
                    }
                ];

                for (var i = 0, len = rules.length; i < len; i++) {
                    if (rules[i].regex.test(bucketName) === rules[i].check) {
                        ctrl.$setValidity(rules[i].validator, false);
                    }
                    else {
                        ctrl.$setValidity(rules[i].validator, true);
                    }
                }
                ctrl.$setValidity('bucketexist', true);
                if (bucketlist.length && $filter('filter')(bucketlist, { Name: bucketName }, true).length) {
                    ctrl.$setValidity('bucketexist', false);
                }

                return bucketName;
            };

            ctrl.$parsers.unshift(validate);
            ctrl.$formatters.push(validate);
        };

        return {
            require: 'ngModel',
            link: link
        };
    }]);

    app.directive('checkExistance', ['$parse', '$filter', function ($parse, $filter) {
        var link = function ($scope, $element, $attrs, ctrl) {
            var validate = function (objName) {
                var checklist = $parse($attrs.checklist)($scope);
                var check = $parse($attrs.checkExistance)($scope) || 'dir';
                ctrl.$setValidity('keyExists', true);
                var status = checklist.find(function (item) {
                    return objName.trim() && ((item.model.name.trim() === objName.trim() || item.model.name.trim() === objName.trim() + '/') && item.model.type === check);
                });

                if (status) {
                    ctrl.$setValidity('keyExists', false);
                }
                return objName;
            };

            ctrl.$parsers.unshift(validate);
            ctrl.$formatters.push(validate);
        };

        return {
            require: 'ngModel',
            link: link
        };
    }]);

})(angular);
