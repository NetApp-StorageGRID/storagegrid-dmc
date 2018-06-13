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

(function (angular, $) {
    'use strict';
    angular.module('DMCApp').service('apiHandler', ['$http', '$q', '$window', '$location', '$rootScope', 'FileUploader', 'UploadProgress', 'AuthService',
        function ($http, $q, $window, $location, $rootScope, FileUploader, uploadProgress, AuthService) {

            $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
            $http.defaults.headers.post['dataType'] = 'json';

            var ApiHandler = function () {
                this.inprocess = false;
                this.error = '';
                this.uploadFileList = [];
            };

            ApiHandler.prototype.deferredHandler = function (data, deferred, code, defaultMsg) {
                if (!data || typeof data !== 'object') {
                    this.error = 'Error %s - Please check the ajax response.'.replace('%s', code);
                    deferred.reject({success: false, message: this.error});
                }
                if (data && data.not_authenticated) {
                    AuthService.forceLogout();
                    if ($window.location.hash !== '#/loginpage') {
                        $window.location.reload();
                    }
                    return deferred.reject(data);
                }
                if (!data.success) {
                    this.error = data.message || defaultMsg;
                    deferred.reject({success: false, message: this.error});
                }
                return deferred.resolve(data);
            };

            ApiHandler.prototype.getPrefix = function (arrayPath) {
                var path = angular.copy(arrayPath);
                path.shift();
                return path.join('');
            };

            ApiHandler.prototype.listBuckets = function (apiUrl) {
                var self = this,
                    deferred = $q.defer();

                self.inprocess = true;
                self.error = '';

                $http.get(apiUrl).success(function (data, code) {
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    self.deferredHandler(data, deferred, code, 'Unknown error occurred while getting the list of buckets.');
                })['finally'](function () {
                    self.inprocess = false;
                });
                return deferred.promise;
            };

            ApiHandler.prototype.createBucket = function (apiUrl, name) {
                var self = this,
                    deferred = $q.defer();

                var data = {
                    name: name
                };

                self.inprocess = true;
                self.error = '';
                $http.post(apiUrl, data).success(function (data, code) {
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    self.deferredHandler(data, deferred, code, "Unknown error occurred while creating the bucket.");
                })['finally'](function () {
                    self.inprocess = false;
                });

                return deferred.promise;
            };

            ApiHandler.prototype.deleteBucket = function (apiUrl, name) {
                var self = this,
                    deferred = $q.defer();

                self.inprocess = true;
                self.error = '';
                $http.delete(apiUrl + '/' + name).success(function (data, code) {
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    self.deferredHandler(data, deferred, code, "Unknonw error occurred while deleting the bucket.");
                })['finally'](function () {
                    self.inprocess = false;
                });
                return deferred.promise;
            };

            ApiHandler.prototype.listObjects = function (apiUrl, path, pageConfig, marker, refreshMarker) {
                var self = this,
                    deferred = $q.defer();

                angular.forEach($rootScope.pendingRequests, function (pendingDeferred) {
                    pendingDeferred.resolve();
                });
                $rootScope.pendingRequests = [];

                var data = {
                    bucketName: path[0],
                    prefix: this.getPrefix(path),
                    path_index: path.length - 1,
                    page_size: pageConfig.pageSize,
                    marker_size: pageConfig.markerSize
                };

                if (marker != undefined) {
                    data.marker = marker;
                }
                if (refreshMarker) {
                    data.refresh_markers = refreshMarker;
                }

                self.inprocess = true;
                self.error = '';

                $rootScope.pendingRequests.push(deferred);
                $http.get(apiUrl, { params: data, timeout: deferred.promise }).success(function (data, code) {
                    $rootScope.pendingRequests.pop();
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    if (code != -1) {
                        self.deferredHandler(data, deferred, code, 'Unknonw error occurred while getting the objects.');
                    }
                })['finally'](function () {
                    self.inprocess = false;
                });
                return deferred.promise;
            };

            ApiHandler.prototype.deleteObjects = function (apiUrl, items, path) {
                var self = this,
                    deferred = $q.defer();

                var data = {
                    items: items,
                    bucket: path[0]
                };

                self.inprocess = true;
                self.error = '';
                $http.post(apiUrl, data).success(function (data, code) {
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    self.deferredHandler(data, deferred, code, "Unknonw error occurred while deleting the objects.");
                })['finally'](function () {
                    self.inprocess = false;
                });
                return deferred.promise;
            };

            ApiHandler.prototype.createFolder = function (apiUrl, name, path) {
                var self = this,
                    deferred = $q.defer();

                var data = {
                    action: 'create_folder',
                    name: name,
                    bucketName: path[0],
                    prefix: this.getPrefix(path)
                };

                self.inprocess = true;
                self.error = '';
                $http.post(apiUrl, data).success(function (data, code) {
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    self.deferredHandler(data, deferred, code, "Unknonw error occurred while creating the folder.");
                })['finally'](function () {
                    self.inprocess = false;
                });

                return deferred.promise;
            };

            ApiHandler.prototype.upload = function (apiUrls, destination, files, partSize) {
                var self = this,
                    deferred = $q.defer(),
                    fileUploads = [];

                self.progress = 0;
                self.error = '';
                self.uploadFileList = [];

                for (var i = 0, len = files.length; i < len; i++) {
                    self.uploadFileList[i] = new FileUploader(files[i], i, destination[0], self.getPrefix(destination), apiUrls, partSize);
                    if (files[i].size > partSize * 1024 * 1024) {
                        fileUploads.push(self.uploadFileList[i].start());
                    }
                    else {
                        fileUploads.push(self.uploadFileList[i].uploadFile());
                    }
                }

                $q.all(fileUploads).then(function (response) {
                    var completedUploads = _.filter(response, { success: true });
                    if (completedUploads.length == self.uploadFileList.length) {
                        deferred.resolve({ success: true });
                    }
                    else {
                        deferred.resolve({ success: false });
                    }
                });

                return deferred.promise;
            };

            ApiHandler.prototype.cancelUpload = function (fileIndex) {
                var self = this,
                    deferred = $q.defer(),
                    cancelledUploads = 0;

                if (fileIndex !== undefined) {
                    self.uploadFileList[fileIndex].cancelMultipartUpload().then(
                        function (response) {
                            uploadProgress.updateStatus(fileIndex, 'Cancelled');
                            deferred.resolve(response);
                        }
                    )
                }
                else {
                    var promises = [];
                    for (var i = 0, len = this.uploadFileList.length; i < len; i++) {
                        if (!uploadProgress.isNonMultipartUpload(i)) {
                            if (uploadProgress.allowCancel(i)) {
                                cancelledUploads++;
                                promises.push(self.uploadFileList[i].cancelMultipartUpload());
                            }
                            else {
                                this.uploadFileList[i].cancelUpload = true;
                                if (!uploadProgress.getStatus(i) === 'Completed' || !uploadProgress.getStatus(i) === 'Error') {
                                    uploadProgress.updateStatus(i, 'Cancelled');
                                }
                            }
                        }
                    }
                    $q.all(promises).then(function (response) {
                        var successStatus = _.filter(response, { success: true });
                        if (cancelledUploads.length == successStatus) {
                            deferred.resolve({ success: true });
                        }
                        else {
                            deferred.resolve({ success: false });
                        }
                        deferred.resolve(response);
                    });
                }

                return deferred.promise;
            }

            ApiHandler.prototype.download = function (apiUrl, items, path) {
                var self = this,
                    deferred = $q.defer();

                var data = {
                    items: [items],
                    bucket: path[0]
                };

                self.error = '';
                $http.get(apiUrl, { params: data }).success(function (data, code) {
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    self.deferredHandler(data, deferred, code, "Unknonw error occurred while downloading the objects.");
                });
                return deferred.promise;
            };

            ApiHandler.prototype.renameObject = function (apiUrl, path, item, name) {
                var self = this;
                var deferred = $q.defer();
                var data = {
                    bucketName: path[0],
                    prefix: this.getPrefix(path),
                    old_key: item.model.fullkey,
                    new_key: name,
                    type: item.model.type
                };

                self.inprocess = true;
                self.error = '';
                $http.post(apiUrl, data).success(function (data, code) {
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    self.deferredHandler(data, deferred, code, 'Unknonw error occurred while renaming the object.');
                })['finally'](function () {
                    self.inprocess = false;
                });

                return deferred.promise;
            };

            ApiHandler.prototype.objectMetadata = function (apiUrl, path, item) {
                var self = this;
                var deferred = $q.defer();
                var data = {
                    bucket: path[0],
                    name: item.model.fullkey,
                };

                $http.get(apiUrl, {params: data}).success(function (data, code) {
                    deferred.resolve(data);
                }).error(function (data, code) {
                    deferred.reject(data);
                });

                return deferred.promise;
            };

            ApiHandler.prototype.pasteObjects = function (apiUrl, path, items, operation, overwrite) {
                var self = this,
                    deferred = $q.defer();

                var data = {
                    action: 'cut_copy_objects',
                    bucketName: path[0],
                    prefix: this.getPrefix(path),
                    objects: items,
                    operation: operation,
                    overwrite: overwrite
                };

                self.inprocess = true;
                self.error = '';
                $http.post(apiUrl, data).success(function (data, code) {
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    self.deferredHandler(data, deferred, code, "Unknonw error occurred while pasting the objects.");
                })['finally'](function () {
                    self.inprocess = false;
                });
                return deferred.promise;
            };

            return ApiHandler;

        }]);
})(angular, jQuery);