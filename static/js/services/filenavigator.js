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
    angular.module('DMCApp').service('fileNavigator', [
        'apiMiddleware', 'fileManagerConfig', 'item', 'PagerService', '$filter', '$location', '$rootScope', '$interval',
        function (ApiMiddleware, fileManagerConfig, Item, PagerService, $filter, $location, $rootScope, $interval) {

            var FileNavigator = function () {
                this.apiMiddleware = new ApiMiddleware();
                this.requesting = false;
                this.fileList = [];
                this.fileListCopy = [];
                this.currentPath = [];
                this.error = '';
                this.buckets = {};
                this.currentBucket = "";
                this.objects = [];
                this.onRefresh = function () { };
                this.query = "";
                this.pager = {};
                this.page = 1;
                this.pageOffset = 0;
                this.isLastPage = false;
                this.pagedItems = [];
                this.reverseOrder = true;
                this.sortProperty = ['model.type', 'model.name'];
                this.loadedObjects = {};
            };

            FileNavigator.prototype.listObjects = function (marker, refreshMarker) {
                this.currentBucket = this.currentPath[0];
                return this.apiMiddleware.listObjects(this.currentPath, fileManagerConfig.pageConfig, marker, refreshMarker);
            };

            FileNavigator.prototype.listBuckets = function () {
                return this.apiMiddleware.listBuckets();
            };

            FileNavigator.prototype.getBuckets = function (state, refreshMarker) {
                var self = this;
                self.requesting = true;
                self.buckets = {};
                return self.listBuckets().then(function (data) {
                    self.buckets = data.response.Buckets;
                    if (self.buckets.length) {
                        if (!self.currentPath.length || (self.currentBucket !== self.currentPath[0])) {
                            self.currentPath = [self.currentBucket || self.buckets[0].Name];
                        }
                        self.refresh(state, refreshMarker);
                    }
                    else {
                        self.fileList = [];
                        self.pagedItems = [];
                        self.requesting = false;
                    }
                });
            };

            FileNavigator.prototype.refresh = function (marker, refreshMarker) {
                var self = this;
                var path = self.currentPath.join('/');
                self.requesting = true;
                self.fileList = [];
                return self.listObjects(marker, refreshMarker).then(function (data) {
                    if (typeof (data) != "undefined") {
                        data = data.response;
                        self.pageOffset = data.page_offset;
                        self.page = data.page;

                        if (!data.CommonPrefixes) {
                            data.CommonPrefixes = [];
                        }
                        if (!data.Contents) {
                            data.Contents = [];
                        }

                        self.isLastPage = !data.IsTruncated;
                        var d1 = data.CommonPrefixes.slice(0);
                        var d2 = data.Contents.slice(0);
                        var prefix = decodeURIComponent(data.Prefix);

                        var d5 = changeKey(d1, d2, changeName);

                        function changeKey(d1, d2, changeName) {
                            for (var i = 0; i < d1.length; i++) {
                                d1[i].Key = d1[i]['Prefix'];
                                delete d1[i].Prefix;
                                d1[i].type = 'dir';
                                d2.unshift(d1[i]);
                            }
                            return changeName(d2);
                        }

                        function changeName(d2) {
                            var key, response = [];
                            for (var j = 0; j < d2.length; j++) {
                                d2[j].FullKey = d2[j].Key;
                                key = d2[j].Key.replace(prefix, '');
                                if (key) {
                                    d2[j].Key = key;
                                    response.push(d2[j]);
                                }
                            }
                            return response;
                        }

                        self.fileList = (d5 || []).map(function (file) {
                            return new Item(file, self.currentPath);
                        });
                        self.fileListCopy = angular.copy(self.fileList);

                        self.changeSortOrder(self.sortProperty[1], 1)
                        self.loadedObjects = {
                            start: ((self.page - 1) * fileManagerConfig.pageConfig.markerSize) + 1,
                            end: Math.min(((self.page) * fileManagerConfig.pageConfig.markerSize), ((self.page - 1) * fileManagerConfig.pageConfig.markerSize) + self.fileList.length)
                        }
                        self.onRefresh();
                    }
                }, function () {
                    console.log("ERROR:Something went wrong with the request");
                }).finally(function () {
                    var stopSpinner = function () {
                        if ($rootScope.pendingRequests.length == 0) {
                            self.requesting = false;
                            $interval.cancel(promise);
                        }
                    };
                    var promise = $interval(stopSpinner, 100)
                });
            };

            FileNavigator.prototype.changeSortOrder = function (property, page) {
                var self = this,
                    propertyValues = angular.copy(self.sortProperty);

                self.fileList = angular.copy(self.fileListCopy);

                if (page !== undefined) {
                    self.reverseOrder = !self.reverseOrder;
                }

                self.sortProperty[1] = property;
                if (self.reverseOrder) {
                    propertyValues[1] = '-' + property;
                    propertyValues[0] = '-model.type';
                }
                else {
                    propertyValues[1] = property;
                }

                if (property === 'model.name') {
                    propertyValues.splice(2, 1);
                }
                else {
                    propertyValues.push('model.name');
                }

                self.fileList = $filter('orderBy')(self.fileList, propertyValues);
                self.reverseOrder = (self.sortProperty[1] === property) ? !self.reverseOrder : false;
                self.setPage(page || self.pager.currentPage);
            };

            FileNavigator.prototype.setPage = function (page) {
                var self = this;
                if (page < 1 && !self.query) {
                    return;
                }

                if (!self.query) {
                    var flist = angular.copy(self.fileList);
                }
                else {
                    var flist = angular.copy($filter('filter')(self.fileList, function (file) {
                        return file.model.name.toLowerCase().indexOf(self.query.toLowerCase()) != -1;
                    }));
                }

                self.pager = PagerService.GetPager(flist.length, page, fileManagerConfig.pageConfig.pageSize);
                self.pagedItems = flist.slice(self.pager.startIndex, self.pager.endIndex + 1);
            };

            FileNavigator.prototype.bucketClick = function (item) {
                this.query = '';
                this.currentPath = [item];
                this.pager = {};
                this.sortProperty = ['model.type', 'model.name'];
                this.reverseOrder = true;
                this.refresh('first');
            };

            FileNavigator.prototype.objectClick = function (item) {
                this.query = '';
                this.currentPath.push(item.model.name);
                this.refresh();
            };

            FileNavigator.prototype.getPaginatedData = function (direction) {
                this.refresh(direction);
            };

            FileNavigator.prototype.goTo = function (index) {
                this.currentPath = this.currentPath.slice(0, index + 1);
                this.refresh("current");
                return;
            };

            FileNavigator.prototype.objectNameExists = function (objectName, type) {
                return this.fileList.find(function (item) {
                    return objectName.trim && ((item.model.name.trim() === objectName.trim() || item.model.name.trim() === objectName.trim() + '/') && item.model.type === type);
                });
            };

            return FileNavigator;
        }]);
})(angular);