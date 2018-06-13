/*
 * StorageGRID Data Management Console (DMC)
 *
 * Copyright (c) 2018, NetApp, Inc.
 *
 * Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)
 */

(function (angular) {
    'use strict';
    angular.module('DMCApp').service('FileUploader', ['$http', '$q', 'Upload', 'UploadProgress', '$interval', function ($http, $q, Upload, uploadProgress, $interval) {

        var S3MultiUpload = function (file, index, bucketName, uploadPath, apiUrls, partSize) {
            uploadProgress.addFile(file.name, file.size, index);

            this.fileIndex = index;
            this.apiUrls = apiUrls;
            this.uploadPath = uploadPath;
            this.bucketName = bucketName;
            this.part_size = partSize * 1024 * 1024;
            this.file = file;

            this.fileInfo = {
                name: this.file.name,
                type: this.file.type,
                size: this.file.size,
                lastModifiedDate: this.file.lastModifiedDate
            };

            this.blobs = [];
            this.uploadId = null;
            this.partsTrack = [];
            this.pendingUploads = {};
            this.promises = [];
            this.cancelUpload = false;
        };

        S3MultiUpload.prototype.start = function (callback) {

            var self = this,
                deferred = $q.defer();

            uploadProgress.updateStatus(self.fileIndex, 'Initiating');

            var params = {
                fileInfo: self.fileInfo,
                bucketName: self.bucketName,
                prefix: self.uploadPath,
                filename: self.fileInfo.name
            };

            $http.get(self.apiUrls.createUploadUrl, { params: params })
                .success(function (response, code) {
                    if (!response.success) {
                        uploadProgress.updateStatus(self.fileIndex, 'Error', response.message);
                        deferred.resolve({ success: false, message: response.message });
                    }
                    else {
                        if (!self.cancelUpload) {
                            uploadProgress.updateStatus(self.fileIndex, 'Initiated');
                        }
                        self.uploadId = response.response.UploadId;
                        self.uploadParts().then(function (data) {
                            deferred.resolve(data);
                        });
                    }
                })
                .error(function (response, code) {
                    uploadProgress.updateStatus(self.fileIndex, 'Error', 'Unknown error while initiating upload.');
                    deferred.resolve({ success: false, message: 'Unknown error while initiating upload.' });
                });
            return deferred.promise;
        }

        S3MultiUpload.prototype.uploadParts = function () {

            var self = this,
                deferred = $q.defer(),
                start = 0,
                end,
                partNumber = 0;

            self.blobs = [];

            if (!self.cancelUpload) {
                uploadProgress.updateStatus(self.fileIndex, 'Uploading');

                while (true) {
                    start = self.part_size * partNumber++;
                    end = Math.min(start + self.part_size, self.file.size);
                    self.blobs.push(self.file.slice(start, end));
                    if (end >= self.file.size) { break; }
                }

                uploadProgress.setParts(self.fileIndex, self.blobs.length);

                for (var i = 0, len = self.blobs.length; i < len; i++) {
                    self.uploadPart(i);
                }

                $q.all(self.promises).then(
                    function (response) {
                        var successResponse = _.filter(response, { success: true });
                        if (successResponse.length == self.blobs.length) {
                            uploadProgress.updateStatus(self.fileIndex, 'Completing...');
                            self.partsTrack = _.sortBy(self.partsTrack, 'PartNumber');
                            self.completeMultipartUpload().success(function (response, code) {
                                if (response.success) {
                                    deferred.resolve({ success: true });
                                    uploadProgress.updateStatus(self.fileIndex, 'Completed');
                                }
                                else {
                                    uploadProgress.updateStatus(self.fileIndex, 'Error', response.message);
                                    deferred.resolve({ success: false, message: response.message });
                                }
                            }).error(function (response, code) {
                                uploadProgress.updateStatus(self.fileIndex, 'Error', 'Unknown error while completing upload.');
                                deferred.resolve({ success: false, message: 'Unknown error while completing upload.' });
                            });
                        }
                        else {
                            if (!self.cancelUpload) {
                                uploadProgress.updateStatus(self.fileIndex, 'Error', 'Some parts failed while uploading file.');
                                deferred.resolve({ success: false, message: 'Some parts failed while uploading file.' });
                            }
                            else {
                                deferred.resolve({ success: true });
                            }
                        }
                    }, function (response) {
                        if (!self.cancelUpload) {
                            uploadProgress.updateStatus(self.fileIndex, 'Error', 'Unknown error while uploading file.');
                        }
                        deferred.resolve(data);
                    });
                return deferred.promise;
            }
        }

        S3MultiUpload.prototype.uploadPart = function (partNumber) {

            var self = this,
                blob = self.blobs[partNumber];

            self.pendingUploads['part' + partNumber] = $q.defer();

            var data = {
                file: blob,
                uploadId: self.uploadId,
                partNumber: partNumber + 1,
                contentLength: blob.size,
                bucketName: self.bucketName,
                prefix: self.uploadPath,
                filename: self.fileInfo.name
            };

            var uploadPromise = Upload.upload({
                url: self.apiUrls.uploadPartUrl,
                data: data,
                timeout: self.pendingUploads['part' + partNumber].promise
            }).then(
                function (response) {
                    delete self.pendingUploads['part' + partNumber];

                    var data = response.data;
                    if (!data.success) {
                        return { success: false, message: data.message };
                    }
                    else {
                        self.partsTrack.push(data.response);
                        uploadProgress.updateFileProgress(self.fileIndex);
                        return { success: true };
                    }
                }, function (err) {
                    return { success: false, message: 'Unknown error while uploading part.' };
                });

            self.promises.push(uploadPromise);
        }

        S3MultiUpload.prototype.completeMultipartUpload = function () {

            var self = this;
            var params = {
                uploadId: self.uploadId,
                bucketName: self.bucketName,
                prefix: self.uploadPath,
                parts: self.partsTrack,
                filename: self.fileInfo.name
            }
            return $http.post(self.apiUrls.completeUploadUrl, params)
        };

        S3MultiUpload.prototype.uploadFile = function () {
            var self = this,
                deferred = $q.defer();

            uploadProgress.updateStatus(self.fileIndex, 'Uploading');
            var data = {
                file: self.file,
                bucketName: self.bucketName,
                prefix: self.uploadPath,
                filename: self.fileInfo.name
            };

            var uploadPromise = Upload.upload({
                url: self.apiUrls.uploadFileUrl,
                data: data
            }).then(
                function (response) {
                    var data = response.data;
                    if (!data.success) {
                        uploadProgress.updateStatus(self.fileIndex, 'Error', data.message);
                        deferred.resolve(data);
                    }
                    else {
                        uploadProgress.updateStatus(self.fileIndex, 'Completed');
                        deferred.resolve({ success: true });
                    }
                }, function (err) {
                    if (!self.cancelUpload) {
                        uploadProgress.updateStatus(self.fileIndex, 'Error', 'Unknown error while uploading file.');
                        deferred.resolve({ success: false, message: 'Unknown error while uploading file.' });
                    }
                    else {
                        deferred.resolve({ success: true });
                    }
                }, function (evt) {
                    var percentage = parseInt((evt.loaded / evt.total * 100));
                    uploadProgress.updateFileProgress(self.fileIndex, percentage);
                });

            return deferred.promise;
        }

        S3MultiUpload.prototype.cancelMultipartUpload = function () {

            var self = this,
                deferred = $q.defer();

            uploadProgress.updateStatus(self.fileIndex, 'Cancelling...');
            self.cancelUpload = true;

            var checkStatus = function () {
                if (self.uploadId) {
                    $interval.cancel(promise);
                    return cancelUpload();
                }
            };
            var promise = $interval(checkStatus, 1000);

            function cancelUpload() {

                _.each(self.pendingUploads, function (pendingPromise, part) {
                    pendingPromise.resolve();
                });

                var data = {
                    uploadId: self.uploadId,
                    filename: self.fileInfo.name,
                    bucketName: self.bucketName,
                    prefix: self.uploadPath
                };

                $http.post(self.apiUrls.cancelUploadUrl, data).success(function (response, code) {
                    if (response.success) {
                        uploadProgress.updateStatus(self.fileIndex, 'Cancelled');
                        deferred.resolve({ success: true });
                    }
                    else {
                        uploadProgress.updateStatus(self.fileIndex, 'Error', response.message);
                        deferred.resolve({ success: false, message: response.message });
                    }
                }).error(function (response, code) {
                    uploadProgress.updateStatus(self.fileIndex, 'Error', 'Unknown error while cancelling upload.');
                    deferred.resolve({ success: false });
                });
            }

            return deferred.promise;
        }

        return S3MultiUpload;
    }]);
})(angular);