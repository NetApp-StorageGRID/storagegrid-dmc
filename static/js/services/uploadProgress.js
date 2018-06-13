/*
 * StorageGRID Data Management Console (DMC)
 *
 * Copyright (c) 2018, NetApp, Inc.
 *
 * Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)
 */

(function (angular) {
    'use strict';
    angular.module('DMCApp').factory('UploadProgress', [function () {
        var filesInfo = [];

        var filesProgress = {
            addFile: function (filename, size, index) {
                filesInfo[index] = {
                    filename: filename,
                    size: size,
                    progress: 0,
                    status: 'Error',
                    isMultipart: false,
                    errorMsg: ''
                };
            },
            setParts: function (index, parts) {
                filesInfo[index].isMultipart = true;
                filesInfo[index].parts = new Array(parts);
            },
            updateFileProgress: function (index, progress) {
                if (filesInfo[index].isMultipart) {
                    filesInfo[index].progress += 100 / filesInfo[index].parts.length;
                }
                else {
                    filesInfo[index].progress = progress - 1;
                }
            },
            updateStatus: function (index, status, errorMsg) {
                if (filesInfo[index]) {
                    filesInfo[index].status = status;
                    if (status === 'Error' && errorMsg !== undefined) {
                        filesInfo[index].errorMsg = errorMsg;
                    }
                }
            },
            getProgress: function (index) {
                return filesInfo[index] && filesInfo[index].progress;
            },
            getStatus: function (index) {
                return (filesInfo[index] && filesInfo[index].status) || '';
            },
            resetFiles: function () {
                filesInfo = [];
            },
            isInitiated: function () {
                var initiatedFiles = _.filter(filesInfo, { 'status': 'Initiating' });
                return initiatedFiles.length ? true : false
            },
            isUploading: function () {
                var cancelledFiles = _.filter(filesInfo, { 'status': 'Uploading' });
                return cancelledFiles.length ? true : false
            },
            showProgressBar: function (index) {
                return filesInfo[index] && filesInfo[index].status === 'Uploading' ? true : false
            },
            enableCloseButton: function () {
                var finishedUploads = _.filter(filesInfo, function (file) {
                    return _.includes(['Cancelled', 'Error', 'Completed'], file.status);
                });
                return (!this.isUploading() && finishedUploads.length === filesInfo.length && !this.isInitiated()) || !filesInfo.length;
            },
            isAllFinished: function () {
                var finishedUploads = _.filter(filesInfo, function (file) {
                    return _.includes(['Cancelled', 'Error', 'Completed'], file.status);
                });
                return filesInfo.length && finishedUploads.length === filesInfo.length
            },
            showStatus: function (index) {
                return filesInfo[index] && _.includes(['Error', 'Cancelling...', 'Cancelled', 'Completed', 'Completing...'], filesInfo[index].status);
            },
            allowCancel: function (index) {
                return _.includes(['Uploading', 'Initiated', 'Initiating'], this.getStatus(index));
            },
            isNonMultipartUpload: function (index) {
                return filesInfo[index] && !filesInfo[index].isMultipart;
            },
            disableCancelAllButton: function () {
                var resolvedMultipartUploads = _.filter(filesInfo, function (file) {
                    return file.isMultipart && (_.includes(['Cancelled', 'Cancelling...', 'Error', 'Completed'], file.status));
                });
                var multipartUploads = _.filter(filesInfo, { 'isMultipart': true }).length;
                var nonMultipartUploads = _.filter(filesInfo, { 'isMultipart': false }).length;

                return (filesInfo.length === nonMultipartUploads || resolvedMultipartUploads.length === multipartUploads) ? true : false;
            },
            getErrorMsg: function (index) {
                return filesInfo[index] && filesInfo[index].errorMsg;
            }
        }

        return filesProgress;
    }]);
})(angular);