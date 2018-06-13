/*
 * StorageGRID Data Management Console (DMC)
 *
 * Copyright (c) 2018, NetApp, Inc.
 *
 * Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)
 */

(function (angular) {
    'use strict';
    angular.module('DMCApp').controller('AuthCtrl',
        ['$scope', '$location', 'AuthService', 'fileManagerConfig',
            function ($scope, $location, AuthService, fileManagerConfig) {

                $scope.auth = {};
                $scope.config = fileManagerConfig;
                $scope.authService = AuthService;
                $scope.error = "";
                $scope.login = function (form) {
                    $scope.error = "";
                    $scope.inprocess = true;
                    var encrypt = new JSEncrypt();
                    encrypt.setPublicKey($('#public_key').text());
                    var post_data = angular.copy($scope.auth);
                    post_data.secret_key = encrypt.encrypt($scope.auth.secret_key);

                    $scope.authService.login(post_data).then(function (data) {
                        $location.path('/');
                        $scope.auth = {};
                    }, function (data) {
                        if (data.message === "Connection failure.") {
                            $scope.error = "Connection failure. It may be due to incorrect endpoint."
                        }
                        else {
                            $scope.error = data.message;
                        }
                    })['finally'](function () {
                        $scope.inprocess = false;
                    });

                    form.$setPristine();
                    form.$setUntouched();
                };

                $scope.logout = function () {
                    $scope.authService.logout().then(function () {
                        $location.path('/loginpage');
                    }, function(data){
                        $scope.error = data.message;
                    });
                };
            }]);

})(angular);