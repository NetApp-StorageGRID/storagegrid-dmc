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
    angular.module('DMCApp').provider('fileManagerConfig', function () {

        var values = {
            loginUrl: '/login',
            logoutUrl: '/logout',
            listUrl: '/list_objects',
            listBucketsUrl: '/bucket',
            createBucketUrl: '/bucket',
            deleteBucketUrl: '/bucket',
            deleteObjectsUrl: '/delete_objects',
            createObjectUrl: '/object',
            multipartUploadUrls: {
                createUploadUrl: '/create_multipart_upload',
                uploadPartUrl: '/upload_part',
                completeUploadUrl: '/complete_multipart_upload',
                cancelUploadUrl: '/cancel_multipart_upload',
                uploadFileUrl: '/upload_file'
            },
            downloadUrl: '/download',
            renameUrl: '/rename_object',
            metadataUrl: '/object',
            pasteUrl: '/object',
            searchForm: true,
            breadcrumb: true,
            allowedActions: {
                delete: true,
                download: true,
                createFolder: true,
                upload: true,
                rename: true,
                changeConfig: true,
                cut: true,
                copy: true,
                paste: true
            },
            showExtensionIcons: true,
            useBinarySizePrefixes: false,
            tplPath: 'static/partials',
            imgPath: 'static/images',
            pageConfig: {},
            minPageSize: 10,
            minPageMarkerSize: 10,
            minUploadPartSizeInMB: 5,
            uploadPartSizeInMB: 5
        };

        return {
            $get: function () {
                return values;
            },
            set: function (constants) {
                angular.extend(values, constants);
            }
        };

    });
})(angular);
