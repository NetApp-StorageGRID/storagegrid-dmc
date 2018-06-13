# StorageGRID Data Management Console (DMC)

# Copyright (c) 2018, NetApp, Inc.

# Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)

DMC_INVALID_ACCESS_KEY = 'Invalid Access Key. Expected length is 20 characters.'
DMC_INVALID_SECRET_KEY = 'Invalid Secret Key. Expected length is 40 characters.'
DMC_INVALID_REST_ENDPOINT = 'Invalid REST Endpoint.'
DMC_INVALID_PORT = 'Invalid Port. Valid values are 0 to 65535.'
DMC_BOTO_EXCEPTIONS = {
    'InvalidAccessKeyId': 'Invalid Access Key.',
    'SignatureDoesNotMatch': 'Invalid Secret Key.',
    'NoSuchBucket': 'The specified bucket does not exist.',
    '404': 'Not found.',
    'NoSuchUpload': 'The specified multipart upload does not exist. The upload ID might be invalid, '
                    'or the multipart upload might have been aborted or completed.',
    'MalformedPOSTRequest': 'The body of your POST request is not well-formed multipart/form-data.',
    'NoSuchKey': 'The specified key does not exist.',
    'ConnectionError': 'Connection failure.',
    'SSLError': 'SSL Error.'
}
DMC_MISSING_PARAMS = 'Missing input parameter: {}.'
DMC_INT_TYPE_CAST_ERROR = '{} must be positive integer.'
DMC_DOWNLOAD_FOLDER_FAILED = 'Download folder "{}" failed. Please check the log for more details.'
DMC_BUCKET_NAME_RULES = {
    'rule1': 'Bucket Name must be between 3 and 63 characters long and must contain only '
             'lowercase characters, numbers, periods, and dashes.',
    'rule2': 'Bucket Name must start with a lowercase letter or number.',
    'rule3': 'Bucket Name must not contain dashes adjacent to periods.',
    'rule4': 'Bucket Name must not contain two adjacent periods.',
    'rule5': 'Bucket Name must not end with dash or period.',
    'rule6': 'Bucket Name must not resemble an IP address.'
}
