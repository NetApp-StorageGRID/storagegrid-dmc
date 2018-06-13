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

(function (window, angular, $) {
    'use strict';
    angular.module('DMCApp', ['ngRoute', 'ngFileUpload'])
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                .when('/', {
                    templateUrl: 'static/partials/s3browser.html',
                    access: { restricted: true }
                })
                .when('/loginpage', {
                    templateUrl: 'static/partials/login.html',
                    controller: 'AuthCtrl',
                    access: { restricted: false }
                })
                .when('/logout', {
                    controller: 'AuthCtrl',
                    access: { restricted: true }
                })
                .otherwise({
                    redirectTo: '/',
                    access: { restricted: true }
                });
        }]);

    angular.module('DMCApp').run(function ($rootScope, $location, $route, AuthService) {
        $rootScope.pendingRequests = [];
        $rootScope.$on('$routeChangeStart', function (event, next, current) {
            $('.modal').modal('hide');
            if (AuthService.isLoggedIn()) {
                $location.path('/');
            }
            else {
                AuthService.getUserStatus().then(null, function (data) {
                    if ($location.path() !== '/loginpage') {
                        $location.path('/loginpage');
                        $route.reload();
                    }
                });
            }
        });
    });

    $(window.document).on('shown.bs.modal', '.modal', function () {
        window.setTimeout(function () {
            $('[autofocus]', this).focus();
        }.bind(this), 100);
    });

    $(window.document).on('click', function () {
        $('#context-menu').hide();
    });

    $(window.document).on('contextmenu', '.main-navigation .table-files tr.item-list:has("td"), .item-list, .objects-scrollable-div', function (e) {
        var menu = $('#context-menu');

        if (e.pageX >= window.innerWidth - menu.width()) {
            e.pageX -= menu.width();
        }
        if (e.pageY >= window.innerHeight - menu.height()) {
            e.pageY -= menu.height();
        }

        menu.hide().css({
            left: e.pageX,
            top: e.pageY
        }).show();
        e.preventDefault();
    });

    $.notifyDefaults({
        delay: 10000,
        placement: {
            from: "bottom"
        },
        animate: {
            enter: "animated fadeInUp",
            exit: "animated fadeOutDown"
        }
    });

    if (!Array.prototype.find) {
        Array.prototype.find = function (predicate) {
            if (this == null) {
                throw new TypeError('Array.prototype.find called on null or undefined');
            }
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            var list = Object(this);
            var length = list.length >>> 0;
            var thisArg = arguments[1];
            var value;

            for (var i = 0; i < length; i++) {
                value = list[i];
                if (predicate.call(thisArg, value, i, list)) {
                    return value;
                }
            }
            return undefined;
        };
    }

})(window, angular, jQuery);
