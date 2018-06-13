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
    angular.module('DMCApp').controller('FileManagerCtrl', [
        '$scope', '$rootScope', '$window', 'fileManagerConfig', 'item', 'fileNavigator',
        'apiMiddleware', 'PagerService', 'AuthService', '$filter', 'UploadProgress',
        function ($scope, $rootScope, $window, fileManagerConfig, Item, FileNavigator,
            ApiMiddleware, PagerService, AuthService, $filter, UploadProgress) {

            var $storage = $window.localStorage;
            $scope.config = fileManagerConfig;
            $scope.fileNavigator = new FileNavigator();
            $scope.apiMiddleware = new ApiMiddleware();
            $scope.authService = AuthService;
            $scope.viewTemplate = $storage.getItem('viewTemplate') || 'main-icons.html';
            $scope.config.pageConfig = JSON.parse($storage.getItem('pageConfig'), function (k, v) {
                return (typeof v === "object" || isNaN(v)) ? v : parseInt(v, 10);
            }) || { pageSize: 20, markerSize: 1000 };
            $scope.config.uploadPartSizeInMB = parseInt($storage.getItem('uploadPartSize'), 10) || 5;
            $scope.fileList = [];
            $scope.temps = [];
            $scope.selectedItem;
            $scope.newBucketName = '';
            $scope.newFolderName = '';
            $scope.newObjectName = '';
            $scope.error = '';
            $scope.newConfiguration = {};
            $scope.newUploadPartSizeInMB = 5;
            $scope.PagerService = PagerService;
            $scope.visiblePath = [];
            $scope.uploadFileList = [];
            $scope.uploadProgress = UploadProgress;
            $scope.cancelUploadIndex = '';
            $scope.tempCutCopy = { operation: '', list: [] };
            $scope.cutCopyPath = '';
            $scope.overwrite = true;
            $scope.conflictedPasteFolder = '';
            $scope.versionInfo = 'v' + $('#dmc_version').text() + '-' + $('#dmc_build').text();

            $scope.changeConfig = function (form) {
                var pageSize = parseInt($scope.newConfiguration.pageSize, 10),
                    markerSize = parseInt($scope.newConfiguration.markerSize, 10),
                    partSize = parseInt($scope.newUploadPartSizeInMB, 10);

                if (isNaN(pageSize) || isNaN(markerSize) || isNaN(partSize)) {
                    $scope.error = 'Please provide valid integer values.';
                    return;
                }

                if ($scope.config.uploadPartSizeInMB !== partSize) {
                    $scope.config.uploadPartSizeInMB = partSize;
                    $storage.setItem('uploadPartSize', $scope.config.uploadPartSizeInMB);
                }

                if (!_.isEqual($scope.newConfiguration, $scope.config.pageConfig)) {
                    $scope.config.pageConfig = { pageSize: pageSize, markerSize: markerSize };
                    $storage.setItem('pageConfig', JSON.stringify($scope.config.pageConfig));
                    $scope.fileNavigator.refresh('first');
                }
                $scope.modal('configurations');
                $scope.resetForm(form);
            };

            $scope.$watchCollection('fileNavigator.currentPath', function () {
                var totalChar = 0;
                var checkLength = 0;
                //Calculating max allowed characters for dynamic width because 93 is the max characters that can be fit in a length of 667 px
                var maxAllowedChar = Math.floor($(".breadcrumb").width() * 93 / 667);
                $scope.visiblePath = [];
                var tempVisiblePath = [];
                var noUnshiftFlag = false;
                var pathLen = $scope.fileNavigator.currentPath.length;
                var totalLen = maxAllowedChar;
                var remainingLen = totalLen;
                var tempFolder = "";
                for (var i = pathLen - 1; i >= 0; i--) {
                    tempFolder = $scope.fileNavigator.currentPath[i];
                    if (i < pathLen - 2) {
                        remainingLen = remainingLen - tempFolder.length - 5;
                    }
                    if (i == pathLen - 1) {
                        if (tempFolder.length > maxAllowedChar - 30) {
                            tempFolder = tempFolder.substring(0, maxAllowedChar - 30) + "...";
                            remainingLen = maxAllowedChar - tempFolder.length;
                        }
                        else {
                            remainingLen = remainingLen - tempFolder.length;
                        }
                    }
                    else if (i == pathLen - 2) {
                        if (tempFolder.length - 3 > (remainingLen - 20) && remainingLen > 3) {
                            tempFolder = tempFolder.substring(0, remainingLen - 20 - 3) + "...";
                            remainingLen = remainingLen - tempFolder.length;
                        }
                        else {
                            remainingLen = remainingLen - tempFolder.length;
                        }
                    }
                    else if (tempFolder.length >= remainingLen) {
                        noUnshiftFlag = true;
                        break;
                    }
                    if (!noUnshiftFlag) {
                        tempVisiblePath.unshift(tempFolder);
                    }
                }

                $scope.visiblePath = angular.copy(tempVisiblePath);
            });

            $scope.fileNavigator.onRefresh = function () {
                $scope.temps = [];
                $scope.selectedItem = undefined;
            };

            $scope.setTemplate = function (name) {
                $storage.setItem('viewTemplate', name);
                $scope.viewTemplate = name;
            };

            $scope.isSelected = function (item) {
                return $scope.temps.indexOf(item) !== -1;
            };

            $scope.selectOrUnselect = function (item, $event) {
                var indexInTemp = $scope.temps.indexOf(item);
                var isRightClick = $event && $event.which == 3;

                if (indexInTemp === -1 && isRightClick) {
                    $scope.temps = [];
                    $scope.selectedItem = undefined;
                    return;
                }

                if ($event && $event.target.hasAttribute('prevent')) {
                    $scope.temps = [];
                    $scope.selectedItem = undefined;
                    return;
                }
                if (!item || (isRightClick && $scope.isSelected(item))) {
                    return;
                }
                if ($event && $event.shiftKey && !isRightClick) {
                    var list = $scope.fileList;
                    var indexInList = list.indexOf(item);
                    var lastSelected = $scope.temps[0];
                    var i = list.indexOf(lastSelected);
                    var current = undefined;
                    if (lastSelected && list.indexOf(lastSelected) < indexInList) {
                        $scope.temps = [];
                        $scope.selectedItem = undefined;
                        while (i <= indexInList) {
                            current = list[i];
                            !$scope.isSelected(current) && $scope.temps.push(current);
                            i++;
                        }
                        return;
                    }
                    if (lastSelected && list.indexOf(lastSelected) > indexInList) {
                        $scope.temps = [];
                        while (i >= indexInList) {
                            current = list[i];
                            !$scope.isSelected(current) && $scope.temps.push(current);
                            i--;
                        }
                        return;
                    }
                }
                if ($event && !isRightClick && ($event.ctrlKey || $event.metaKey)) {
                    $scope.isSelected(item) ? $scope.temps.splice(indexInTemp, 1) : $scope.temps.push(item);
                    $scope.selectedItem = undefined;
                    return;
                }

                $scope.temps = [item];
                $scope.selectedItem = item.model;
                var objectName = $scope.selectedItem.name;
                if ($scope.temps.length === 1 && item.model.type === 'file') {
                    $scope.selectedItem.serverSideEncryption = '';
                    $scope.apiMiddleware.objectMetadata($scope.fileNavigator.currentPath, $scope.temps[0]).then(function (data) {
                        if ($scope.selectedItem && $scope.selectedItem.name === objectName) {
                            $scope.selectedItem.serverSideEncryption = data.ServerSideEncryption || 'None';
                        }
                    }, function () {
                        if ($scope.selectedItem && $scope.selectedItem.name === objectName) {
                            $scope.selectedItem.serverSideEncryption = 'Failed';
                        }
                    });
                }
            };

            $scope.singleSelection = function () {
                return $scope.temps.length === 1 && $scope.temps[0];
            };

            $scope.smartClick = function (item) {
                if (item.isFolder()) {
                    $scope.temps = [];
                    return $scope.fileNavigator.objectClick(item);
                }
            };

            $scope.modal = function (id, show) {
                var element = $('#' + id);
                element.modal(show ? 'show' : 'hide');
                $scope.apiMiddleware.apiHandler.error = '';
                $scope.error = '';
                if (show) {
                    if (id === 'newfolder') {
                        $scope.newFolderName = '';
                    }
                    else if (id === 'newbucket') {
                        $scope.newBucketName = '';
                    }
                    else if (id === 'configurations') {
                        $scope.newConfiguration = angular.copy($scope.config.pageConfig);
                        $scope.newUploadPartSizeInMB = angular.copy($scope.config.uploadPartSizeInMB);
                    }
                    else if (id === 'renameobject') {
                        $scope.newObjectName = $scope.temps[0].model.name;
                    }
                }
            };

            $scope.createBucket = function (form) {
                var name = $scope.newBucketName;

                $scope.error = "";
                $scope.apiMiddleware.createBucket(name).then(function () {
                    $scope.newBucketName = "";
                    $scope.modal('newbucket');
                    if (!$scope.fileNavigator.currentBucket) {
                        $scope.fileNavigator.getBuckets(undefined, true);
                    }
                    else if ($scope.fileNavigator.currentBucket && $scope.fileNavigator.currentBucket != name) {
                        $scope.fileNavigator.getBuckets('current');
                    }
                    $scope.resetForm(form);
                });
            };

            $scope.createFolder = function (form) {
                var name = $scope.newFolderName;

                $scope.apiMiddleware.createFolder(name, $scope.fileNavigator.currentPath).then(function () {
                    $scope.newFolderName = "";
                    $scope.fileNavigator.refresh('current');
                    $scope.modal('newfolder');
                    $scope.resetForm(form);
                });
            };

            $scope.deleteBucket = function () {
                var name = $scope.fileNavigator.currentPath[0];

                $scope.apiMiddleware.deleteBucket(name).then(function () {
                    $scope.modal('deletebucket');
                    $scope.fileNavigator.currentPath = [];
                    $scope.fileNavigator.currentBucket = '';
                    $scope.fileNavigator.getBuckets();
                });
            };

            $scope.deleteObjects = function () {
                $scope.apiMiddleware.deleteObjects($scope.temps, $scope.fileNavigator.currentPath).then(function () {
                    $scope.fileNavigator.refresh('current');
                    $scope.modal('deleteobjects');
                });
            };

            $scope.reloadAll = function () {
                $scope.fileNavigator.currentPath = [$scope.fileNavigator.buckets[0].Name];
                $scope.fileNavigator.currentBucket = $scope.fileNavigator.buckets[0].Name;
                $scope.fileNavigator.getBuckets(undefined, true);
            };

            $scope.addForUpload = function ($files) {
                if ($scope.uploadProgress.isAllFinished()) {
                    $scope.uploadFileList = [];
                    $scope.uploadProgress.resetFiles();
                }
                $scope.uploadFileList = $scope.uploadFileList.concat($files);
                $scope.modal('uploadfile', true);
            };

            $scope.removeFromUpload = function (index) {
                $scope.uploadFileList.splice(index, 1);
            };

            $scope.uploadFiles = function () {
                $scope.error = '';

                $scope.apiMiddleware.upload($scope.uploadFileList, $scope.fileNavigator.currentPath).then(
                    function (data) {
                        if (!data.success) {
                            $scope.error = "Error while uploading some files.";
                        }
                        $scope.fileNavigator.refresh('current');
                    });
            };

            $scope.cancelUploadPrompt = function (selection) {
                if (selection === 'all') {
                    if ($scope.uploadProgress.isUploading()) {
                        $scope.modal('confirmcancelalluploads', true);
                    }
                    else {
                        $scope.cancelUpload();
                    }
                }
                else {
                    $scope.cancelUploadIndex = selection;
                    $scope.modal('confirmcancelupload', true);
                }
            };

            $scope.cancelUpload = function (fileIndex) {
                $scope.modal('confirmcancelalluploads');
                $scope.modal('confirmcancelupload');
                $scope.cancelUploadIndex = '';
                $scope.error = '';

                $scope.apiMiddleware.cancelUpload(fileIndex).then(null, function () {
                    $scope.error = "Error while cancelling upload.";
                });
            };

            $scope.closeUploadDialog = function () {
                $scope.uploadFileList = [];
                $scope.uploadProgress.resetFiles();
                $scope.modal('uploadfile');
            };

            $scope.download = function () {
                var download_urls;
                $.notify(
                    {
                        icon: 'fa fa-info-circle',
                        message: 'Downloading may take some time to initiate. Please wait.'
                    }, {
                        type: 'info'
                    });

                $scope.apiMiddleware.download($scope.temps, $scope.fileNavigator.currentPath).then(
                    function (data) {
                        if (data.success) {
                            download_urls = data.response.download_urls;

                            var link = document.createElement('a');

                            link.style.display = 'none';

                            document.body.appendChild(link);

                            for (var i = 0; i < download_urls.length; i++) {
                                link.setAttribute('download', download_urls[i].download_as);
                                link.setAttribute('href', download_urls[i].link);
                                link.click();
                            }

                            document.body.removeChild(link);
                        }
                    }, function (data) {
                        if (data && !data.success) {
                            $.notify(
                                {
                                    icon: 'fa fa-exclamation-circle',
                                    message: data.message
                                }, {
                                    type: 'danger'
                                });
                        }
                    });
            };

            $scope.renameObject = function (form) {
                var name = $scope.newObjectName;

                $scope.apiMiddleware.renameObject($scope.fileNavigator.currentPath, $scope.temps[0], name).then(function () {
                    $scope.fileNavigator.refresh('current');
                    $scope.modal('renameobject');
                    $scope.newObjectName = "";
                    $scope.resetForm(form);
                });
            };

            $scope.cutcopy = function (operation) {
                $scope.tempCutCopy = {
                    operation: operation,
                    list: angular.copy($scope.temps)
                }
                $scope.cutCopyPath = $scope.fileNavigator.currentPath.join('/');
            }

            $scope.paste = function () {
                $scope.modal('confirmconflictpaste');
                var temp = angular.copy($scope.tempCutCopy.list);
                var conflict = $scope.getConflictedPasteItem();
                if (!_.isEmpty(conflict)) {
                    temp.splice(conflict.index, 1);
                }

                var objects = _.map(temp, function (value) {
                    return {
                        bucket: value.model.path[0],
                        key: value.model.name,
                        fullkey: value.model.fullkey,
                        type: value.model.type
                    };
                })

                $scope.apiMiddleware.pasteObjects($scope.fileNavigator.currentPath, objects, $scope.tempCutCopy.operation, $scope.overwrite).then(function (data) {
                    if ($scope.tempCutCopy.operation === 'cut') {
                        $scope.tempCutCopy = { operation: '', list: [] };
                    }
                    $scope.modal('confirmpasteoverwrite');
                    $scope.fileNavigator.refresh('current');
                });

            }

            $scope.resetForm = function (form) {
                form.$setPristine();
                form.$setUntouched();
            }

            $scope.getUploadPath = function () {
                var currentPath = angular.copy($scope.fileNavigator.currentPath);
                var path = currentPath[0] + '/';
                currentPath.shift();
                path += currentPath.join('');
                return path;
            }

            $scope.$watch('fileNavigator.query', function () {
                $scope.fileNavigator.setPage(1);
                $scope.temps = [];
                $scope.selectedItem = undefined;
            });

            $scope.checkPasteOperation = function () {
                var conflict = $scope.getConflictedPasteItem();
                if (!_.isEmpty(conflict)) {
                    $scope.modal('confirmconflictpaste', true);
                    return;
                }
                $scope.modal('confirmpasteoverwrite', true);
            }

            $scope.openPasteConfirmDialog = function () {
                var selections = angular.copy($scope.tempCutCopy.list);
                var conflict = $scope.getConflictedPasteItem();
                if (!_.isEmpty(conflict)) {
                    if (selections.length > 1) {
                        $scope.modal('confirmpasteoverwrite', true);
                    }
                }
            }

            $scope.getConflictedPasteItem = function () {
                var selections = angular.copy($scope.tempCutCopy.list);
                var pastePath = $scope.fileNavigator.currentPath.join('/');

                for (var i = 0, len = selections.length; i < len; i++) {
                    if (pastePath.startsWith(selections[i].model.fullPath())) {
                        $scope.conflictedPasteFolder = { name: selections[i].model.name, index: i };
                        return { name: selections[i].model.name, index: i };
                    }
                }
                $scope.conflictedPasteFolder = {};
                return {};
            }

            $scope.fileNavigator.getBuckets(undefined, true);

        }]);
})(angular, jQuery);
