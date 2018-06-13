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
    angular.module('DMCApp').factory('item', ['fileManagerConfig', function (fileManagerConfig) {

        var Item = function (model, path) {
            var rawModel = {
                name: model && model.Key || '',
                fullkey: model && model.FullKey || '',
                path: path || [],
                type: model && model.type || 'file',
                storageclass: model && model.StorageClass || '',
                etag: model && model.ETag || '',
                size: model && parseInt(model.Size || 0),
                date: parseDate(model && (model.LastModified || '')),
                owner: model && model.Owner || '',
                serverSideEncryption: '',
                fullPath: function () {
                    var path = this.path.filter(Boolean);
                    return (path.join('/') + '/' + this.name);
                }
            };

            this.error = '';
            this.model = angular.copy(rawModel);

            function parseDate(date) {
                if (date === '') {
                    return date;
                }
                else {
                    return new Date(date);
                }
            }
        };

        Item.prototype.isFolder = function () {
            return this.model.type === 'dir';
        };

        return Item;
    }]);
})(angular);