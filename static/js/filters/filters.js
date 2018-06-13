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

    app.filter('strLimit', ['$filter', function ($filter) {
        return function (input, limit, more) {
            if (input.length <= limit) {
                return input;
            }
            return $filter('limitTo')(input, limit) + (more || '...');
        };
    }]);

    app.filter('fileExtension', ['$filter', function ($filter) {
        return function (input) {
            return /\./.test(input) && $filter('strLimit')(input.split('.').pop(), 3, '..') || '';
        };
    }]);

    app.filter('humanReadableFileSize', ['$filter', 'fileManagerConfig', function ($filter, fileManagerConfig) {

        var decimalByteUnits = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var binaryByteUnits = ['iB', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

        return function (input) {
            var i = 0;
            var fileSizeInBytes = input;

            if (!(fileSizeInBytes < 1024)) {
                do {
                    fileSizeInBytes = fileSizeInBytes / 1024;
                    i++;
                } while (fileSizeInBytes > 1024);
            }
            var result = fileManagerConfig.useBinarySizePrefixes ? binaryByteUnits[i] : decimalByteUnits[i];
            return Math.max(fileSizeInBytes, 0).toFixed(2) + ' ' + result;
        };
    }]);
})(angular);
