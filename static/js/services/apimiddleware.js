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
    angular.module('DMCApp').service('apiMiddleware', ['$window', 'fileManagerConfig', 'apiHandler',
        function ($window, fileManagerConfig, ApiHandler) {

            var ApiMiddleware = function () {
                this.apiHandler = new ApiHandler();
            };

            ApiMiddleware.prototype.listBuckets = function () {
                return this.apiHandler.listBuckets(fileManagerConfig.listBucketsUrl);
            };

            ApiMiddleware.prototype.createBucket = function (name) {
                return this.apiHandler.createBucket(fileManagerConfig.createBucketUrl, name);
            };

            ApiMiddleware.prototype.deleteBucket = function (name) {
                return this.apiHandler.deleteBucket(fileManagerConfig.deleteBucketUrl, name);
            };

            ApiMiddleware.prototype.listObjects = function (path, pageConfig, marker, refreshMarker) {
                return this.apiHandler.listObjects(fileManagerConfig.listUrl, path, pageConfig, marker, refreshMarker);
            };

            ApiMiddleware.prototype.getFileList = function (files) {
                return (files || []).map(function (file) {
                    return file && { key: file.model.fullkey, type: file.model.type };
                });
            };

            ApiMiddleware.prototype.deleteObjects = function (files, path) {
                var items = this.getFileList(files);
                return this.apiHandler.deleteObjects(fileManagerConfig.deleteObjectsUrl, items, path);
            };

            ApiMiddleware.prototype.createFolder = function (name, path) {
                return this.apiHandler.createFolder(fileManagerConfig.createObjectUrl, name, path);
            };

            ApiMiddleware.prototype.upload = function (files, path) {
                if (!$window.FormData) {
                    throw new Error('Unsupported browser version');
                }

                return this.apiHandler.upload(fileManagerConfig.multipartUploadUrls, path, files, fileManagerConfig.uploadPartSizeInMB);
            };

            ApiMiddleware.prototype.cancelUpload = function (fileIndex) {
                return this.apiHandler.cancelUpload(fileIndex);
            };

            ApiMiddleware.prototype.download = function (files, path) {
                var items = this.getFileList(files);
                return this.apiHandler.download(fileManagerConfig.downloadUrl, items, path);
            };

            ApiMiddleware.prototype.renameObject = function (path, item, name) {
                return this.apiHandler.renameObject(fileManagerConfig.renameUrl, path, item, name);
            };

            ApiMiddleware.prototype.objectMetadata = function (path, item) {
                return this.apiHandler.objectMetadata(fileManagerConfig.metadataUrl, path, item);
            };

            ApiMiddleware.prototype.pasteObjects = function (path, items, operation, overwrite) {
                return this.apiHandler.pasteObjects(fileManagerConfig.pasteUrl, path, items, operation, overwrite);
            }

            return ApiMiddleware;

        }]);
})(angular);