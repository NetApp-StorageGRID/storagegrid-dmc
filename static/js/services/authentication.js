/*
 * StorageGRID Data Management Console (DMC)
 *
 * Copyright (c) 2018, NetApp, Inc.
 *
 * Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)
 */
(function (angular) {
    'use strict';
    angular.module('DMCApp').factory('AuthService', ['$q', '$timeout', '$http', 'fileManagerConfig',
        function ($q, $timeout, $http, fileManagerConfig) {

            var isValidated = null;
            var account_name = null;

            return ({
                isLoggedIn: isLoggedIn,
                login: login,
                logout: logout,
                getUserStatus: getUserStatus,
                getName: getName,
                forceLogout: forceLogout
            });

            function isLoggedIn() {
                return isValidated ? true : false;
            }

            function getName() {
                return account_name;
            }

            function login(auth) {
                var deferred = $q.defer();
                $http.post(fileManagerConfig.loginUrl, auth).success(function (data, code) {
                    if (!data || typeof data !== 'object') {
                        deferred.reject({ success: false, message: 'Error %s - Please check the ajax response.'.replace('%s', code) });
                    }
                    else if (data.success) {
                        isValidated = true;
                        account_name = data.response.Owner.DisplayName;
                        deferred.resolve(data);
                    }
                    else {
                        deferred.reject(data);
                    }
                }).error(function (data, code) {
                    deferred.reject({ success: false, message: 'Unknown error occurred while logging in. Please refresh the page and try again.' });
                });
                return deferred.promise;
            }

            function logout() {
                var deferred = $q.defer();

                $http.get(fileManagerConfig.logoutUrl).success(function (data, code) {
                    if (!data || typeof data !== 'object') {
                        deferred.reject({ success: false, message: 'Error %s - Please check the ajax response.'.replace('%s', code) });
                    }
                    else if (data.success) {
                        isValidated = false;
                        account_name = "";
                        deferred.resolve(data);
                    }
                    else {
                        deferred.reject(data);
                    }
                }).error(function (data, code) {
                    deferred.reject({ success: false, message: 'Unknown error occurred while logging out.' });
                });

                return deferred.promise;
            }

            function getUserStatus() {
                var deferred = $q.defer();

                $http.get(fileManagerConfig.loginUrl).success(function (data, code) {
                    if (!data || typeof data !== 'object') {
                        deferred.reject({ success: false, message: 'Error %s - Please check the ajax response.'.replace('%s', code) });
                    }
                    else if (data.success) {
                        isValidated = true;
                        account_name = data.name;
                        deferred.resolve(data);
                    }
                    else {
                        isValidated = null;
                        account_name = null;
                        deferred.reject(data);
                    }
                }).error(function (data, code) {
                    isValidated = null;
                    account_name = null;
                    deferred.reject(data);
                });

                return deferred.promise;
            }

            function forceLogout() {
                isValidated = null;
                account_name = null;
            }

        }]);

})(angular);