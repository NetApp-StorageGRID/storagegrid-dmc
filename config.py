# StorageGRID Data Management Console (DMC)

# Copyright (c) 2018, NetApp, Inc.

# Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)

from Crypto.Cipher import PKCS1_v1_5
from Crypto.PublicKey import RSA

keys = RSA.generate(2048)
secret_code = "Dmc@1234"
private_key = keys.exportKey(passphrase=secret_code)
public_key = keys.publickey().exportKey()
imported_key = RSA.import_key(private_key, passphrase=secret_code)
cipher_rsa = PKCS1_v1_5.new(imported_key)
